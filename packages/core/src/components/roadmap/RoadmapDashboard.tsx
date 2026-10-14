import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    Plus,
    ArrowRight,
    MoreVertical,
    Calendar,
    Target,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Layout,
    BarChart3,
    Zap,
    FileText,
    Search,
    Shield,
    Sparkles,
    Trash2,
    Edit3,
    ChevronRight
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@complianceos/ui/ui/dropdown-menu";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { useClientContext } from "@/contexts/ClientContext";
import { PageGuide } from "@/components/PageGuide";
import { Breadcrumb } from "@/components/Breadcrumb";
import ReportGeneratorDialog from "./ReportGeneratorDialog";
import { StrategicFastTrackWidget } from "./StrategicFastTrackWidget";

// Type definition for Roadmap data
interface RoadmapData {
    id: number;
    title: string;
    description: string | null;
    framework?: string | null;
    status: string;
    progress?: number;
    milestoneCount?: number;
    completedMilestones?: number;
    targetDate?: string | Date | null;
    updatedAt: string | Date;
    createdAt?: string | Date;
}

// Utility function to clean up descriptions that might be stored as JSON configuration strings
const sanitizeText = (text: string | null, fallback: string): string => {
    if (!text) return fallback;
    const trimmed = text.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === 'object' && parsed !== null) {
                const displayFields = ['title', 'name', 'description', 'summary', 'goal', 'objective'];
                for (const field of displayFields) {
                    if (parsed[field] && typeof parsed[field] === 'string') {
                        return parsed[field].substring(0, 500);
                    }
                }
                const firstString = Object.values(parsed).find(v => typeof v === 'string' && v.length > 5);
                if (firstString) return (firstString as string).substring(0, 500);
            }
        } catch {
            // Invalid JSON, fall through
        }
        return fallback;
    }
    return trimmed.substring(0, 500);
};

export default function RoadmapDashboard() {
    const params = useParams();
    const clientIdParam = params.id ? parseInt(params.id, 10) : null;
    const { selectedClientId } = useClientContext();

    const clientId = clientIdParam || selectedClientId;
    const [location, setLocation] = useLocation();
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Fetch roadmaps with milestone metrics
    const { data: roadmaps, isLoading, error, refetch } = trpc.roadmap.listStrategic.useQuery(
        { clientId: clientId! },
        {
            enabled: !!clientId,
            retry: (failureCount, error: any) => {
                if (error?.message?.includes('JSON.parse') || error?.message?.includes('unexpected end')) {
                    return failureCount < 2;
                }
                return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000),
        }
    );

    const deleteMutation = trpc.roadmap.delete.useMutation({
        onSuccess: () => {
            toast.success("Roadmap deleted successfully");
            refetch();
        },
        onError: (error) => {
            toast.error(`Error deleting roadmap: ${error.message}`);
        },
    });

    const handleDelete = async (id: string | number) => {
        if (confirm("Are you sure you want to delete this roadmap?")) {
            await deleteMutation.mutateAsync({ id: String(id) });
        }
    };

    // Category groupings
    const activeRoadmaps = useMemo(() =>
        (roadmaps || []).filter(r => ['active', 'in_progress', 'on_track'].includes(r.status?.toLowerCase())),
        [roadmaps]
    );

    const criticalRoadmaps = useMemo(() =>
        (roadmaps || []).filter(r => ['at_risk', 'blocked', 'behind', 'delayed'].includes(r.status?.toLowerCase())),
        [roadmaps]
    );

    const draftingRoadmaps = useMemo(() =>
        (roadmaps || []).filter(r => ['draft', 'planning'].includes(r.status?.toLowerCase())),
        [roadmaps]
    );

    const completedRoadmaps = useMemo(() =>
        (roadmaps || []).filter(r => ['completed', 'archived'].includes(r.status?.toLowerCase())),
        [roadmaps]
    );

    // Filtered roadmaps based on search and status tabs
    const filteredRoadmaps = useMemo(() => {
        if (!roadmaps) return [];

        return roadmaps.filter((roadmap) => {
            const matchesSearch =
                roadmap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (roadmap.description && roadmap.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (roadmap.framework && roadmap.framework.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            const st = roadmap.status?.toLowerCase();
            if (statusFilter === 'active') return ['active', 'in_progress', 'on_track'].includes(st);
            if (statusFilter === 'critical') return ['at_risk', 'blocked', 'behind', 'delayed'].includes(st);
            if (statusFilter === 'planning') return ['draft', 'planning'].includes(st);
            if (statusFilter === 'completed') return ['completed', 'archived'].includes(st);
            return true;
        });
    }, [roadmaps, searchQuery, statusFilter]);

    if (!clientId) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
                    Please select a client to view roadmaps.
                </div>
            </DashboardLayout>
        );
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-slate-600">Loading roadmaps...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-center max-w-md p-6 bg-white rounded-xl border border-red-100 shadow-sm">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <p className="text-red-700 font-semibold text-lg">Failed to load roadmaps</p>
                        <p className="text-slate-500 text-sm mt-2">{error.message}</p>
                        <div className="flex gap-2 justify-center mt-6">
                            <Button onClick={() => refetch()} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8 p-6 sm:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-300">
                {/* Header & PageGuide */}
                <div className="flex items-center justify-between">
                    <Breadcrumb items={[{ label: "Strategic Roadmap" }]} />
                    <PageGuide
                        title="Strategic Roadmap"
                        description="Align compliance initiatives with business growth and operational milestones."
                        rationale="A roadmap transforms a static compliance checklist into a dynamic execution plan. It helps stakeholders understand the timeline, resource requirements, and dependencies for reaching multi-year compliance goals."
                        howToUse={[
                            {
                                step: "Define Strategy",
                                description: "Use 'New Strategic Roadmap' to start a new strategic cycle or project.",
                                targetId: "roadmap-create-btn"
                            },
                            {
                                step: "Monitor Milestones",
                                description: "Track active initiatives to ensure milestones stay on schedule.",
                                targetId: "roadmap-initiatives"
                            },
                            {
                                step: "Report Progress",
                                description: "Generate executive-ready reports to communicate roadmap status to leadership.",
                                targetId: "roadmap-report-btn"
                            }
                        ]}
                        scenarios={[
                            {
                                title: "Board Meeting Preparation",
                                example: "You need to demonstrate that the ISO 27001 certification initiative is 60% complete and on track for next quarter.",
                                auditTip: "Auditors look for evidence of management oversight. A well-maintained roadmap demonstrates compliance is part of corporate planning."
                            }
                        ]}
                        integrations={[
                            { name: "Compliance Journey", description: "Milestones here feed into your overall journey progress." },
                            { name: "Assurance Reports", description: "Generate board-ready summaries of your strategic posture." }
                        ]}
                    />
                </div>

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg border border-slate-800">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                    <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="max-w-2xl space-y-3">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-2.5 py-0.5 text-xs font-medium">
                                    <Sparkles className="w-3 h-3 mr-1 text-emerald-400" />
                                    Strategic Execution Layer
                                </Badge>
                                <span className="text-xs text-slate-300">
                                    {roadmaps?.length || 0} Total Initiatives
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Strategic Roadmap Command Center
                            </h1>
                            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                                Align compliance initiatives with business milestones, track real operational progress, and maintain executive audit readiness.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                id="roadmap-create-btn"
                                onClick={() => setLocation(`/clients/${clientId}/roadmap/templates`)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md font-semibold h-10 px-5"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                New Strategic Roadmap
                            </Button>
                            <Button
                                id="roadmap-report-btn"
                                variant="outline"
                                onClick={() => setReportDialogOpen(true)}
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium h-10 px-4"
                            >
                                <FileText className="w-4 h-4 mr-2 text-emerald-400" />
                                Generate Report
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setLocation(`/clients/${clientId}/reports`)}
                                className="text-slate-300 hover:text-white hover:bg-white/10 font-medium h-10 px-3"
                            >
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Reports Archive
                            </Button>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics Summary Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md border-slate-200 ${statusFilter === 'all' ? 'ring-2 ring-blue-500/50 bg-blue-50/20' : 'bg-white'}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Initiatives</p>
                                <p className="text-2xl font-bold text-slate-900">{roadmaps?.length || 0}</p>
                                <p className="text-xs text-slate-500">Across all compliance cycles</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Target className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md border-slate-200 ${statusFilter === 'active' ? 'ring-2 ring-emerald-500/50 bg-emerald-50/20' : 'bg-white'}`}
                        onClick={() => setStatusFilter('active')}
                    >
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Active Execution</p>
                                <p className="text-2xl font-bold text-slate-900">{activeRoadmaps.length}</p>
                                <p className="text-xs text-slate-500">Currently in progress</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Zap className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md border-slate-200 ${statusFilter === 'critical' ? 'ring-2 ring-amber-500/50 bg-amber-50/20' : 'bg-white'}`}
                        onClick={() => setStatusFilter('critical')}
                    >
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Attention Required</p>
                                <p className="text-2xl font-bold text-slate-900">{criticalRoadmaps.length}</p>
                                <p className="text-xs text-slate-500">At risk or delayed</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md border-slate-200 ${statusFilter === 'planning' ? 'ring-2 ring-indigo-500/50 bg-indigo-50/20' : 'bg-white'}`}
                        onClick={() => setStatusFilter('planning')}
                    >
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Planning & Drafts</p>
                                <p className="text-2xl font-bold text-slate-900">{draftingRoadmaps.length}</p>
                                <p className="text-xs text-slate-500">In preparation</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Clock className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 90-DAY IMPLEMENTATION FAST-TRACK SPRINTS (Tactical Execution Layer) */}
                <StrategicFastTrackWidget clientId={clientId} />

                {/* Toolbar: Search and Filter Tabs */}
                <div id="roadmap-initiatives" className="space-y-6 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                size="sm"
                                variant={statusFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('all')}
                                className="h-9 px-3.5 text-xs font-semibold"
                            >
                                All ({roadmaps?.length || 0})
                            </Button>
                            <Button
                                size="sm"
                                variant={statusFilter === 'active' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('active')}
                                className="h-9 px-3.5 text-xs font-semibold"
                            >
                                <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                                Active Execution ({activeRoadmaps.length})
                            </Button>
                            <Button
                                size="sm"
                                variant={statusFilter === 'critical' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('critical')}
                                className="h-9 px-3.5 text-xs font-semibold"
                            >
                                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                                Attention Required ({criticalRoadmaps.length})
                            </Button>
                            <Button
                                size="sm"
                                variant={statusFilter === 'planning' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('planning')}
                                className="h-9 px-3.5 text-xs font-semibold"
                            >
                                <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                                Planning ({draftingRoadmaps.length})
                            </Button>
                            {completedRoadmaps.length > 0 && (
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'completed' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('completed')}
                                    className="h-9 px-3.5 text-xs font-semibold"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                                    Completed ({completedRoadmaps.length})
                                </Button>
                            )}
                        </div>

                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search roadmaps..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>
                    </div>

                    {/* Initiatives Grid */}
                    {filteredRoadmaps.length === 0 ? (
                        <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50/50">
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-400">
                                <Layout className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">No roadmaps found</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                {searchQuery || statusFilter !== 'all'
                                    ? "No initiatives match your current filters. Try resetting your search or filter criteria."
                                    : "You haven't created any strategic roadmaps for this client yet."}
                            </p>
                            <div className="mt-4 flex gap-2 justify-center">
                                {(searchQuery || statusFilter !== 'all') && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                                    >
                                        Reset Filters
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    onClick={() => setLocation(`/clients/${clientId}/roadmap/templates`)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Create Roadmap
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRoadmaps.map((roadmap) => (
                                <RoadmapCard
                                    key={roadmap.id}
                                    roadmap={roadmap}
                                    clientId={clientId!}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <ReportGeneratorDialog
                    open={reportDialogOpen}
                    onOpenChange={setReportDialogOpen}
                    clientId={clientId!}
                />
            </div>
        </DashboardLayout>
    );
}

// ----------------------------------------------------------------------
// Polished Roadmap Initiative Card Component
// ----------------------------------------------------------------------

function RoadmapCard({
    roadmap,
    clientId,
    onDelete,
}: {
    roadmap: RoadmapData;
    clientId: number | string;
    onDelete: (id: number | string) => void;
}) {
    const [, setLocation] = useLocation();

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        switch (s) {
            case 'active':
            case 'on_track':
                return { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            case 'at_risk':
            case 'delayed':
            case 'behind':
                return { label: 'Attention Required', className: 'bg-amber-50 text-amber-700 border-amber-200' };
            case 'planning':
            case 'draft':
                return { label: 'Planning', className: 'bg-blue-50 text-blue-700 border-blue-200' };
            case 'completed':
                return { label: 'Completed', className: 'bg-slate-100 text-slate-700 border-slate-200' };
            default:
                return { label: status.replace('_', ' '), className: 'bg-slate-50 text-slate-600 border-slate-200' };
        }
    };

    const statusBadge = getStatusBadge(roadmap.status);
    const progress = Math.min(100, Math.max(0, roadmap.progress ?? 0));
    const milestoneCount = roadmap.milestoneCount ?? 0;
    const completedMilestones = roadmap.completedMilestones ?? 0;

    return (
        <Card className="group hover:shadow-lg transition-all duration-200 border-slate-200 hover:border-slate-300 bg-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={`capitalize text-[11px] font-semibold h-5 px-2 ${statusBadge.className}`}>
                            {statusBadge.label}
                        </Badge>
                        {roadmap.framework && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[11px] font-medium h-5 px-2">
                                <Shield className="w-3 h-3 mr-1 text-slate-500" />
                                {roadmap.framework}
                            </Badge>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Initiative Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setLocation(`/clients/${clientId}/roadmap/${roadmap.id}`)}
                                className="cursor-pointer"
                            >
                                <Layout className="w-4 h-4 mr-2 text-slate-500" />
                                Open Strategic Board
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setLocation(`/clients/${clientId}/roadmap/${roadmap.id}/edit`)}
                                className="cursor-pointer"
                            >
                                <Edit3 className="w-4 h-4 mr-2 text-slate-500" />
                                Edit Configuration
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-700 cursor-pointer"
                                onClick={() => onDelete(roadmap.id)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Roadmap
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="pt-2">
                    <h3
                        onClick={() => setLocation(`/clients/${clientId}/roadmap/${roadmap.id}`)}
                        className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors cursor-pointer line-clamp-1"
                        title={roadmap.title}
                    >
                        {sanitizeText(roadmap.title, roadmap.title)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                        {sanitizeText(roadmap.description, "Strategic compliance implementation and audit readiness initiative.")}
                    </p>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
                {/* Real Milestone Progress */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-600">
                            {milestoneCount > 0
                                ? `${completedMilestones} of ${milestoneCount} Milestones`
                                : "Milestone Progress"}
                        </span>
                        <span className="font-bold text-slate-900">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-slate-100" />
                </div>

                {/* Date & Meta Info */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                    <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        <span>
                            {roadmap.targetDate
                                ? `Target: ${format(new Date(roadmap.targetDate), 'MMM yyyy')}`
                                : `Updated ${format(new Date(roadmap.updatedAt), 'MMM d, yyyy')}`}
                        </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">ID #{roadmap.id}</span>
                </div>

                {/* Primary Card CTA */}
                <Button
                    variant="outline"
                    className="w-full text-xs font-semibold h-9 bg-slate-50/80 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-200 mt-2"
                    onClick={() => setLocation(`/clients/${clientId}/roadmap/${roadmap.id}`)}
                >
                    Open Strategic Board
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
            </CardContent>
        </Card>
    );
}
