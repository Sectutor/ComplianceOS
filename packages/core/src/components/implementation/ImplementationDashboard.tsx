import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Progress } from "@complianceos/ui/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@complianceos/ui/ui/tabs";
import {
    Plus,
    Layout,
    ArrowRight,
    Calendar,
    ClipboardList,
    Trash2,
    FileText,
    Search,
    LayoutGrid,
    ListTodo,
    CheckCircle2,
    Clock,
    Zap,
    Target,
    Layers,
    Sparkles,
    MoreVertical,
    ChevronRight,
    Shield,
    Users,
    FolderKanban,
    GanttChart,
    Printer,
    Copy,
    Check,
    Award
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation, useParams } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { trpc } from '@/lib/trpc';
import ImplementationReportDialog from './ImplementationReportDialog';
import { toast } from 'sonner';
import { MyTasksView } from './MyTasksView';
import { TeamWorkloadChart } from './TeamWorkloadChart';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@complianceos/ui/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@complianceos/ui/ui/dropdown-menu";
import { PageGuide } from "@/components/PageGuide";
import { Breadcrumb } from "@/components/Breadcrumb";
import { format } from "date-fns";

export default function ImplementationDashboard() {
    const params = useParams();
    const [, setLocation] = useLocation();
    const clientIdParam = params.id ? parseInt(params.id, 10) : null;
    const { selectedClientId } = useClientContext();
    const clientId = clientIdParam || selectedClientId;

    // Filter & view mode states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");

    // Dialog states
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
    const [selectedRoadmapId, setSelectedRoadmapId] = useState<number | null>(null);
    const [planToDelete, setPlanToDelete] = useState<{ id: number; title: string } | null>(null);

    // Auditor Brief state
    const [auditBriefPlanId, setAuditBriefPlanId] = useState<number | null>(null);
    const [auditBriefOpen, setAuditBriefOpen] = useState(false);
    const [copiedSummary, setCopiedSummary] = useState(false);

    const utils = trpc.useContext();

    // Fetch implementation plans with task statistics
    const { data: plans, isLoading } = trpc.implementation.list.useQuery({
        clientId: clientId!
    }, { enabled: !!clientId });

    // Fetch roadmaps for "Create from Roadmap" capability
    const { data: roadmaps } = trpc.roadmap.listStrategic.useQuery(
        { clientId: clientId! },
        { enabled: !!clientId }
    );

    // Fetch audit brief when dialog is opened
    const { data: auditBrief, isLoading: loadingAuditBrief } = trpc.implementation.getAuditBrief.useQuery(
        { planId: auditBriefPlanId!, clientId: clientId! },
        { enabled: !!auditBriefPlanId && auditBriefOpen }
    );

    // Delete plan mutation
    const deletePlanMutation = trpc.implementation.deletePlan.useMutation({
        onSuccess: () => {
            toast.success("Plan deleted successfully");
            utils.implementation.list.invalidate();
            setDeleteDialogOpen(false);
            setPlanToDelete(null);
        },
        onError: (err) => {
            toast.error("Failed to delete plan", { description: err.message });
        }
    });

    // Create plan from strategic roadmap
    const createFromRoadmap = trpc.implementation.createFromRoadmap.useMutation({
        onSuccess: (res: any) => {
            toast.success("Implementation plan created from roadmap", {
                description: `Generated ${res.taskCount || 0} tasks.`
            });
            utils.implementation.list.invalidate();
            setRoadmapDialogOpen(false);
            if (res.planId) {
                setLocation(`/clients/${clientId}/implementation/plan/${res.planId}`);
            }
        },
        onError: (err: any) => {
            toast.error("Failed to create plan from roadmap", { description: err.message });
        }
    });

    const handleDeleteClick = (e: React.MouseEvent, plan: any) => {
        e.stopPropagation();
        setPlanToDelete(plan);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (planToDelete) {
            deletePlanMutation.mutate({ planId: planToDelete.id });
        }
    };

    const handleOpenAuditBrief = (planId: number) => {
        setAuditBriefPlanId(planId);
        setAuditBriefOpen(true);
        setCopiedSummary(false);
    };

    // Calculate aggregated high-level KPIs across all plans
    const { totalAllTasks, totalActiveTasks, totalDoneTasks, overallProgress } = useMemo(() => {
        if (!plans || plans.length === 0) {
            return { totalAllTasks: 0, totalActiveTasks: 0, totalDoneTasks: 0, overallProgress: 0 };
        }
        const totalAll = plans.reduce((acc: number, p: any) => acc + (p.totalTasks || 0), 0);
        const totalActive = plans.reduce((acc: number, p: any) => acc + (p.inProgressTasks || 0) + (p.reviewTasks || 0), 0);
        const totalDone = plans.reduce((acc: number, p: any) => acc + (p.completedTasks || 0), 0);
        const overall = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
        return {
            totalAllTasks: totalAll,
            totalActiveTasks: totalActive,
            totalDoneTasks: totalDone,
            overallProgress: overall
        };
    }, [plans]);

    // Filtered plans list
    const filteredPlans = useMemo(() => {
        if (!plans) return [];
        return plans.filter((plan: any) => {
            const matchesSearch =
                plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (plan.description && plan.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (plan.frameworkTag && plan.frameworkTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (plan.linkedRoadmapTitle && plan.linkedRoadmapTitle.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            const st = (plan.status || "").toLowerCase();
            if (statusFilter === "in_progress") return ["in_progress", "active"].includes(st);
            if (statusFilter === "not_started") return ["not_started", "planning", "draft"].includes(st);
            if (statusFilter === "completed") return ["completed", "done"].includes(st);
            return true;
        });
    }, [plans, searchQuery, statusFilter]);

    if (!clientId) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
                    Please select a client to view tactical implementation.
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout fullWidth={true}>
            <div className="p-6 sm:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300">
                {/* Header & PageGuide */}
                <div className="flex items-center justify-between">
                    <Breadcrumb items={[{ label: "Tactical Implementation" }]} />
                    <PageGuide
                        title="Tactical Implementation"
                        description="Execution hub for compliance task waves, remediation plans, and team assignments."
                        rationale="Translates high-level strategic roadmap milestones into granular engineering and operational tasks mapped across the Plan, Do, Check, Act lifecycle."
                        howToUse={[
                            { step: "Select or Create Plan", description: "Create a plan manually, from templates, or derived from an active strategic roadmap." },
                            { step: "Kanban Task Board", description: "Move work items across Backlog, To Do, In Progress, Review, and Done columns." },
                            { step: "Multi-Framework Phase View", description: "Inspect tasks organized cleanly by PDCA chapters with compliance controls attached." },
                            { step: "Auditor Briefing", description: "Generate one-click audit-ready summaries detailing implementation progress." }
                        ]}
                        integrations={[
                            { name: "Strategic Roadmap", description: "Inherits strategic milestones and feeds execution status back to leadership." },
                            { name: "Framework Controls", description: "Directly verifies implemented controls with operational evidence." }
                        ]}
                    />
                </div>

                {/* Executive Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg border border-slate-800">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                    <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="max-w-2xl space-y-3">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-2.5 py-0.5 text-xs font-medium">
                                    <Sparkles className="w-3 h-3 mr-1 text-emerald-400" />
                                    Tactical Execution Layer
                                </Badge>
                                <span className="text-xs text-slate-300">
                                    {plans?.length || 0} Implementation Waves
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Tactical Implementation Hub
                            </h1>
                            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                                Execute compliance programs with precision. Manage cross-functional remediation tasks, orchestrate PDCA workstreams, and track team velocity.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Link href={`/clients/${clientId}/implementation/create`}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md font-semibold h-10 px-5">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Implementation Plan
                                </Button>
                            </Link>

                            {roadmaps && roadmaps.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setRoadmapDialogOpen(true)}
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium h-10 px-4"
                                >
                                    <Target className="w-4 h-4 mr-2 text-blue-400" />
                                    From Roadmap
                                </Button>
                            )}

                            <Link href={`/clients/${clientId}/implementation/templates`}>
                                <Button
                                    variant="outline"
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium h-10 px-4"
                                >
                                    <Layers className="w-4 h-4 mr-2 text-indigo-400" />
                                    Template Library
                                </Button>
                            </Link>

                            <Button
                                variant="ghost"
                                onClick={() => setReportDialogOpen(true)}
                                className="text-slate-300 hover:text-white hover:bg-white/10 font-medium h-10 px-3"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Reports
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
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Implementation Waves</p>
                                <p className="text-2xl font-bold text-slate-900">{plans?.length || 0}</p>
                                <p className="text-xs text-slate-500">Active project containers</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <FolderKanban className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Total Work Items</p>
                                <p className="text-2xl font-bold text-slate-900">{totalAllTasks.toLocaleString()}</p>
                                <p className="text-xs text-slate-500">Tasks across all waves</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <ListTodo className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md border-slate-200 ${statusFilter === 'in_progress' ? 'ring-2 ring-emerald-500/50 bg-emerald-50/20' : 'bg-white'}`}
                        onClick={() => setStatusFilter('in_progress')}
                    >
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Active In Progress</p>
                                <p className="text-2xl font-bold text-slate-900">{totalActiveTasks.toLocaleString()}</p>
                                <p className="text-xs text-slate-500">Under development or review</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Zap className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Execution Rate</p>
                                <p className="text-2xl font-bold text-slate-900">{overallProgress}%</p>
                                <div className="w-28 pt-1">
                                    <Progress value={overallProgress} className="h-1.5 bg-slate-100" />
                                </div>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Plans Section Toolbar */}
                <div className="space-y-6 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                size="sm"
                                variant={statusFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('all')}
                                className="h-9 px-3.5 text-xs font-semibold"
                            >
                                All Waves ({plans?.length || 0})
                            </Button>
                            <Button
                                size="sm"
                                variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('in_progress')}
                                className="h-9 px-3.5 text-xs font-semibold"
                            >
                                <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                                In Progress
                            </Button>
                            <Button
                                size="sm"
                                variant={statusFilter === 'not_started' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('not_started')}
                                className="h-9 px-3.5 text-xs font-semibold"
                            >
                                <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                                In Planning
                            </Button>
                            <Button
                                size="sm"
                                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('completed')}
                                className="h-9 px-3.5 text-xs font-semibold"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                                Completed
                            </Button>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search plans & frameworks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            {/* View Switcher: Grid vs Timeline */}
                            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                                <Button
                                    size="sm"
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                    className={`h-8 px-2.5 text-xs font-medium ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Card Grid View"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5 mr-1 text-slate-600" />
                                    Grid
                                </Button>
                                <Button
                                    size="sm"
                                    variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                                    className={`h-8 px-2.5 text-xs font-medium ${viewMode === 'timeline' ? 'bg-white shadow-sm' : ''}`}
                                    onClick={() => setViewMode('timeline')}
                                    title="Timeline Gantt View"
                                >
                                    <GanttChart className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                    Timeline
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Content Display: Grid View vs Timeline View */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : filteredPlans.length === 0 ? (
                        <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50/50">
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-400">
                                <Layout className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">No implementation plans found</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                {searchQuery || statusFilter !== 'all'
                                    ? "No plans match your current search or filter criteria."
                                    : "You haven't initialized any tactical implementation plans for this client yet."}
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
                                <Link href={`/clients/${clientId}/implementation/create`}>
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <Plus className="w-4 h-4 mr-1.5" />
                                        Create New Plan
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* Grid View */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPlans.map((plan: any) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    clientId={clientId!}
                                    onDeleteClick={handleDeleteClick}
                                    onAuditBriefClick={handleOpenAuditBrief}
                                />
                            ))}
                        </div>
                    ) : (
                        /* Timeline Schedule View */
                        <TimelineScheduleView
                            plans={filteredPlans}
                            clientId={clientId!}
                            onAuditBriefClick={handleOpenAuditBrief}
                        />
                    )}
                </div>

                {/* Team & Personal Workstreams Section */}
                <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Team Execution & Assignments</h3>
                            <p className="text-xs text-slate-500">Monitor active personal workload and team bandwidth allocation.</p>
                        </div>
                    </div>

                    <Tabs defaultValue="tasks" className="w-full">
                        <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
                            <TabsTrigger value="tasks" className="text-xs font-semibold">
                                <ListTodo className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                My Assigned Work Items
                            </TabsTrigger>
                            <TabsTrigger value="capacity" className="text-xs font-semibold">
                                <Users className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                                Team Capacity & Workload
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="tasks" className="mt-0">
                            <div className="max-w-3xl">
                                <MyTasksView />
                            </div>
                        </TabsContent>

                        <TabsContent value="capacity" className="mt-0">
                            <div className="max-w-3xl">
                                <TeamWorkloadChart clientId={clientId!} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Report Generation Dialog */}
                <ImplementationReportDialog
                    open={reportDialogOpen}
                    onOpenChange={setReportDialogOpen}
                    clientId={clientId!}
                />

                {/* Dialog to Instantiate from Strategic Roadmap */}
                <Dialog open={roadmapDialogOpen} onOpenChange={setRoadmapDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-600" />
                                Create Plan From Strategic Roadmap
                            </DialogTitle>
                            <DialogDescription>
                                Select an active strategic roadmap. The system will automatically convert its milestones into actionable implementation tasks.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-3">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Active Strategic Roadmaps
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {(roadmaps || []).map((rm: any) => (
                                    <div
                                        key={rm.id}
                                        onClick={() => setSelectedRoadmapId(rm.id)}
                                        className={`p-3 rounded-xl border text-sm cursor-pointer transition-all ${selectedRoadmapId === rm.id
                                            ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="font-semibold text-slate-900">{rm.title}</div>
                                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{rm.description || "Strategic roadmap"}</div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline" className="text-[10px] capitalize">
                                                {rm.status}
                                            </Badge>
                                            <span className="text-[10px] text-slate-400">ID #{rm.id}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRoadmapDialogOpen(false)}>Cancel</Button>
                            <Button
                                disabled={!selectedRoadmapId || createFromRoadmap.isPending}
                                onClick={() => {
                                    if (selectedRoadmapId) {
                                        createFromRoadmap.mutate({
                                            roadmapId: selectedRoadmapId,
                                            clientId: clientId!
                                        });
                                    }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {createFromRoadmap.isPending ? "Generating Plan..." : "Generate Execution Plan"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Auditor Briefing Modal */}
                <Dialog open={auditBriefOpen} onOpenChange={setAuditBriefOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Award className="w-5 h-5 text-indigo-600" />
                                    Auditor Implementation Briefing
                                </DialogTitle>
                                {auditBrief && (
                                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">
                                        {auditBrief.auditReadinessRating}
                                    </Badge>
                                )}
                            </div>
                            <DialogDescription>
                                Formal executive compliance verification briefing prepared for internal auditors and audit committees.
                            </DialogDescription>
                        </DialogHeader>

                        {loadingAuditBrief || !auditBrief ? (
                            <div className="py-12 text-center text-slate-500">
                                Generating auditor compliance briefing...
                            </div>
                        ) : (
                            <div className="space-y-6 py-2 text-sm">
                                {/* Program Header Card */}
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs uppercase font-semibold text-slate-500">Program Wave</div>
                                            <div className="text-base font-bold text-slate-900">{auditBrief.plan.title}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs uppercase font-semibold text-slate-500">Client Scope</div>
                                            <div className="text-sm font-semibold text-slate-700">{auditBrief.clientName}</div>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
                                        <span>Generated: {format(new Date(auditBrief.generatedAt), 'MMMM d, yyyy • HH:mm')}</span>
                                        <span>Target Rating: {auditBrief.auditReadinessRating}</span>
                                    </div>
                                </div>

                                {/* High-Level Metric Gauges */}
                                <div className="grid grid-cols-4 gap-3 text-center">
                                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                                        <div className="text-xs text-slate-500 uppercase font-semibold">Total Scope</div>
                                        <div className="text-xl font-bold text-slate-900">{auditBrief.totalTasks}</div>
                                        <div className="text-[10px] text-slate-400">Controls & Tasks</div>
                                    </div>
                                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                                        <div className="text-xs text-emerald-700 uppercase font-semibold">Completed</div>
                                        <div className="text-xl font-bold text-emerald-700">{auditBrief.completedTasks}</div>
                                        <div className="text-[10px] text-emerald-600">Verified Evidence</div>
                                    </div>
                                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                                        <div className="text-xs text-blue-700 uppercase font-semibold">Active In Work</div>
                                        <div className="text-xl font-bold text-blue-700">{auditBrief.inProgressTasks + auditBrief.reviewTasks}</div>
                                        <div className="text-[10px] text-blue-600">Dev & Review</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="text-xs text-slate-700 uppercase font-semibold">Execution</div>
                                        <div className="text-xl font-bold text-slate-900">{auditBrief.progress}%</div>
                                        <div className="text-[10px] text-slate-500">Overall Rate</div>
                                    </div>
                                </div>

                                {/* PDCA Lifecycle Distribution */}
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        PDCA Lifecycle Workstream Balance
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                        <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/30">
                                            <div className="font-bold text-blue-800">Plan</div>
                                            <div className="text-sm font-black text-slate-900">{auditBrief.pdca.plan}</div>
                                            <div className="text-[10px] text-slate-500">Scope & Policy</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/30">
                                            <div className="font-bold text-indigo-800">Do</div>
                                            <div className="text-sm font-black text-slate-900">{auditBrief.pdca.do}</div>
                                            <div className="text-[10px] text-slate-500">Rollout & Config</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/30">
                                            <div className="font-bold text-amber-800">Check</div>
                                            <div className="text-sm font-black text-slate-900">{auditBrief.pdca.check}</div>
                                            <div className="text-[10px] text-slate-500">Audit & Tests</div>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/30">
                                            <div className="font-bold text-purple-800">Act</div>
                                            <div className="text-sm font-black text-slate-900">{auditBrief.pdca.act}</div>
                                            <div className="text-[10px] text-slate-500">Improvement</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Strategic Auditor Assurance Note */}
                                <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 text-xs text-indigo-950 space-y-1 leading-relaxed">
                                    <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-indigo-600" />
                                        Audit Assurance Verification Note
                                    </div>
                                    <p>
                                        All tasks transitioned into the <strong>Done</strong> state contain linked policy references, operational artifacts, or engineering configurations accessible through the plan&apos;s Phase View and Kanban Board.
                                    </p>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (auditBrief) {
                                        const summaryText = `AUDITOR IMPLEMENTATION BRIEFING\nProgram: ${auditBrief.plan.title}\nClient: ${auditBrief.clientName}\nStatus: ${auditBrief.auditReadinessRating}\nProgress: ${auditBrief.progress}%\nCompleted: ${auditBrief.completedTasks}/${auditBrief.totalTasks} Tasks\nGenerated: ${auditBrief.generatedAt}`;
                                        navigator.clipboard.writeText(summaryText);
                                        setCopiedSummary(true);
                                        toast.success("Briefing copied to clipboard");
                                        setTimeout(() => setCopiedSummary(false), 2000);
                                    }
                                }}
                            >
                                {copiedSummary ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
                                {copiedSummary ? "Copied" : "Copy Briefing"}
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="gap-1.5"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print / PDF
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => {
                                        setAuditBriefOpen(false);
                                        if (auditBriefPlanId) {
                                            setLocation(`/clients/${clientId}/implementation/plan/${auditBriefPlanId}`);
                                        }
                                    }}
                                >
                                    Open Phase Plan
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Alert Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Implementation Plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently remove <strong>{planToDelete?.title}</strong> and all associated tasks across its PDCA workstreams. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                                {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
}

// ----------------------------------------------------------------------
// Polished Data-Rich Implementation Plan Card (Grid View)
// ----------------------------------------------------------------------

function PlanCard({
    plan,
    clientId,
    onDeleteClick,
    onAuditBriefClick,
}: {
    plan: any;
    clientId: number;
    onDeleteClick: (e: React.MouseEvent, plan: any) => void;
    onAuditBriefClick: (planId: number) => void;
}) {
    const [, setLocation] = useLocation();

    const getStatusBadge = (status: string) => {
        const s = (status || "").toLowerCase();
        switch (s) {
            case 'in_progress':
            case 'active':
                return { label: 'In Progress', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
            case 'completed':
            case 'done':
                return { label: 'Completed', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
            default:
                return { label: 'Not Started', className: 'bg-slate-100 text-slate-700 border-slate-200' };
        }
    };

    const statusBadge = getStatusBadge(plan.status);
    const totalTasks = plan.totalTasks ?? 0;
    const completedTasks = plan.completedTasks ?? 0;
    const activeTasks = (plan.inProgressTasks ?? 0) + (plan.reviewTasks ?? 0);
    const todoTasks = (plan.todoTasks ?? 0) + (plan.backlogTasks ?? 0);
    const progress = Math.min(100, Math.max(0, plan.progress ?? 0));

    // Clean display title without raw bracket artifacts like [AISEED]
    const displayTitle = plan.title.replace(/^\[AISEED\]\s*/i, "");

    return (
        <Card className="group hover:shadow-xl transition-all duration-300 border-slate-200 hover:border-slate-300 bg-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={`capitalize text-[11px] font-semibold h-5 px-2 ${statusBadge.className}`}>
                            {statusBadge.label}
                        </Badge>
                        {plan.frameworkTag && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] font-medium h-5 px-1.5">
                                <Shield className="w-3 h-3 mr-1 text-slate-500" />
                                {plan.frameworkTag}
                            </Badge>
                        )}
                        {plan.linkedRoadmapTitle && (
                            <Badge variant="outline" className="bg-blue-50/60 text-blue-700 border-blue-200 text-[10px] h-5 px-1.5 font-medium max-w-[140px] truncate" title={plan.linkedRoadmapTitle}>
                                <Target className="w-3 h-3 mr-1 text-blue-500 shrink-0" />
                                <span className="truncate">{plan.linkedRoadmapTitle}</span>
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
                            <DropdownMenuLabel>Plan Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setLocation(`/clients/${clientId}/implementation/plan/${plan.id}`)}
                                className="cursor-pointer"
                            >
                                <Layers className="w-4 h-4 mr-2 text-slate-500" />
                                View Phase Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setLocation(`/clients/${clientId}/implementation/kanban/${plan.id}`)}
                                className="cursor-pointer"
                            >
                                <LayoutGrid className="w-4 h-4 mr-2 text-slate-500" />
                                Open Kanban Board
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onAuditBriefClick(plan.id)}
                                className="cursor-pointer text-indigo-600"
                            >
                                <Award className="w-4 h-4 mr-2" />
                                Auditor Briefing
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-700 cursor-pointer"
                                onClick={(e) => onDeleteClick(e, plan)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Plan
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="pt-2">
                    <h3
                        onClick={() => setLocation(`/clients/${clientId}/implementation/plan/${plan.id}`)}
                        className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
                        title={displayTitle}
                    >
                        {displayTitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                        {plan.description || "Comprehensive framework implementation wave and operational remediation."}
                    </p>
                </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
                {/* Progress Bar & Milestone Status */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-600">
                            {totalTasks > 0
                                ? `${completedTasks} of ${totalTasks} Tasks Done`
                                : "Execution Progress"}
                        </span>
                        <span className="font-bold text-slate-900">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-slate-100" />
                </div>

                {/* Task Breakdown Stats Bar */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                    <div>
                        <div className="text-[10px] font-medium text-emerald-700 uppercase">Completed</div>
                        <div className="text-xs font-bold text-slate-800">{completedTasks}</div>
                    </div>
                    <div className="border-x border-slate-200">
                        <div className="text-[10px] font-medium text-blue-700 uppercase">In Progress</div>
                        <div className="text-xs font-bold text-slate-800">{activeTasks}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase">Backlog/Todo</div>
                        <div className="text-xs font-bold text-slate-800">{todoTasks}</div>
                    </div>
                </div>

                {/* Date Meta Info */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                    <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        <span>
                            {plan.plannedStartDate && plan.plannedEndDate
                                ? `${format(new Date(plan.plannedStartDate), 'MMM yyyy')} – ${format(new Date(plan.plannedEndDate), 'MMM yyyy')}`
                                : `Created ${format(new Date(plan.createdAt || Date.now()), 'MMM d, yyyy')}`}
                        </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">ID #{plan.id}</span>
                </div>

                {/* Dual Action CTA Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold h-9 bg-white hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => setLocation(`/clients/${clientId}/implementation/plan/${plan.id}`)}
                    >
                        <Layers className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        Phase Plan
                    </Button>
                    <Button
                        size="sm"
                        className="text-xs font-semibold h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        onClick={() => setLocation(`/clients/${clientId}/implementation/kanban/${plan.id}`)}
                    >
                        <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                        Kanban Board
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ----------------------------------------------------------------------
// Timeline Schedule View (Interactive Gantt & Roadmap Timeline)
// ----------------------------------------------------------------------

function TimelineScheduleView({
    plans,
    clientId,
    onAuditBriefClick,
}: {
    plans: any[];
    clientId: number;
    onAuditBriefClick: (planId: number) => void;
}) {
    const [, setLocation] = useLocation();

    return (
        <div className="space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                        <GanttChart className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900 text-base">Execution Wave Timeline Schedule</h3>
                    </div>
                    <span className="text-xs text-slate-500">
                        {plans.length} Multi-Stage Implementation Streams
                    </span>
                </div>

                <div className="divide-y divide-slate-100">
                    {plans.map((plan: any) => {
                        const displayTitle = plan.title.replace(/^\[AISEED\]\s*/i, "");
                        const progress = Math.min(100, Math.max(0, plan.progress ?? 0));

                        // Calculate days remaining or duration
                        const endDate = plan.plannedEndDate ? new Date(plan.plannedEndDate) : null;
                        const now = new Date();
                        const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                        return (
                            <div key={plan.id} className="py-5 first:pt-2 last:pb-2 space-y-3 group hover:bg-slate-50/50 -mx-4 px-4 rounded-xl transition-colors">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4
                                                onClick={() => setLocation(`/clients/${clientId}/implementation/plan/${plan.id}`)}
                                                className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors cursor-pointer"
                                            >
                                                {displayTitle}
                                            </h4>
                                            {plan.frameworkTag && (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px]">
                                                    {plan.frameworkTag}
                                                </Badge>
                                            )}
                                            {plan.linkedRoadmapTitle && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                                    <Target className="w-3 h-3 mr-1" />
                                                    {plan.linkedRoadmapTitle}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="flex items-center">
                                                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                                {plan.plannedStartDate && plan.plannedEndDate
                                                    ? `${format(new Date(plan.plannedStartDate), 'MMM d, yyyy')} ➔ ${format(new Date(plan.plannedEndDate), 'MMM d, yyyy')}`
                                                    : `Created ${format(new Date(plan.createdAt || Date.now()), 'MMM d, yyyy')}`}
                                            </span>
                                            {daysLeft !== null && (
                                                <Badge variant="outline" className={`text-[10px] ${daysLeft > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                    {daysLeft > 0 ? `${daysLeft} days remaining` : 'Target date passed'}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Navigation Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-8 gap-1.5"
                                            onClick={() => onAuditBriefClick(plan.id)}
                                        >
                                            <Award className="w-3.5 h-3.5 text-indigo-600" />
                                            Auditor Brief
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-8 gap-1.5"
                                            onClick={() => setLocation(`/clients/${clientId}/implementation/plan/${plan.id}`)}
                                        >
                                            <Layers className="w-3.5 h-3.5" />
                                            Phase Plan
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5"
                                            onClick={() => setLocation(`/clients/${clientId}/implementation/kanban/${plan.id}`)}
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5" />
                                            Kanban
                                        </Button>
                                    </div>
                                </div>

                                {/* Timeline Progress & Phase Indicator Bar */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-slate-600">
                                            Progress: <strong>{plan.completedTasks || 0}</strong> of <strong>{plan.totalTasks || 0}</strong> Tasks Completed
                                        </span>
                                        <span className="font-bold text-slate-900">{progress}%</span>
                                    </div>
                                    <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
