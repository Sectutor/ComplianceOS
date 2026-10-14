import { cn } from "@/lib/utils";
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Badge } from "@complianceos/ui/ui/badge";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Separator } from "@complianceos/ui/ui/separator";
import { 
    CheckCircle2, 
    Circle, 
    ArrowLeft, 
    MoreHorizontal, 
    Clock, 
    BarChart3, 
    ListFilter,
    Kanban,
    Plus,
    Wand2,
    Sparkles,
    CheckSquare,
    Loader2,
    Search,
    Paperclip,
    AlertCircle,
    ShieldCheck,
    Layers,
    ListTodo
} from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Link, useLocation } from 'wouter';
import { Progress } from "@complianceos/ui/ui/progress";
import { toast } from 'sonner';
import { FrameworkViewRouter } from './frameworks/FrameworkViewRouter';
import { HarmonizationAnalyzer } from '@/components/harmonization/HarmonizationAnalyzer';
import { CertificationTracker } from '@/components/audit/CertificationTracker';
import { PageGuide } from "@/components/PageGuide";
import DashboardLayout from '@/components/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { TaskDetailSheet } from './TaskDetailSheet';

interface MultiFrameworkPlanViewProps {
    planId: number;
    clientId: number;
}

export default function MultiFrameworkPlanView({ planId, clientId }: MultiFrameworkPlanViewProps) {
    const [, setLocation] = useLocation();
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        pdca: 'Plan',
        nist: 'Identify'
    });
    const utils = trpc.useContext();

    const getPhaseStyle = (phase: string) => {
        if (phase === 'all') return "bg-slate-100 text-slate-800 hover:bg-slate-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white border-slate-300";
        if (phase === 'Plan') return "bg-blue-50 text-blue-800 hover:bg-blue-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white border-blue-200";
        if (phase === 'Do') return "bg-amber-50 text-amber-800 hover:bg-amber-100 data-[state=active]:bg-amber-600 data-[state=active]:text-white border-amber-200";
        if (phase === 'Check') return "bg-violet-50 text-violet-800 hover:bg-violet-100 data-[state=active]:bg-violet-600 data-[state=active]:text-white border-violet-200";
        if (phase === 'Act') return "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 data-[state=active]:bg-emerald-600 data-[state=active]:text-white border-emerald-200";
        return "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200";
    };

    const autoAssignMutation = trpc.implementation.autoAssignPdca.useMutation({
        onSuccess: (data: any) => {
            utils.implementation.getPlan.invalidate();
            toast.success(`Lifecycle Orchestrated`, {
                description: `Decomposed requirements into ${data.updatedCount} PDCA tasks.`
            });
        },
        onError: (error: any) => {
            toast.error(`Orchestration Failed`, {
                description: error.message || "Failed to decompose requirements into PDCA tasks. Please check your connection and try again."
            });
        }
    });

    const createTaskMutation = trpc.implementation.createTask.useMutation({
        onSuccess: () => {
            utils.implementation.getPlan.invalidate();
            setAddTaskOpen(false);
            setNewTask({ title: '', description: '', priority: 'medium', pdca: activeTab === 'all' || activeTab === 'framework' ? 'Plan' : activeTab, nist: 'Identify' });
            toast.success("Task created successfully");
        },
        onError: (error: any) => {
            toast.error("Failed to create PDCA task", {
                description: error.message || 'Please check your connection and try again.'
            });
        }
    });

    const { data: plan, isLoading } = trpc.implementation.getPlan.useQuery({
        planId
    }, { enabled: !!planId });

    const frameworkId = plan?.frameworkId || 0;

    // Fetch real phases from the database
    const { data: dbPhases, isLoading: loadingPhases } = trpc.implementation.getFrameworkPhases.useQuery(
        { frameworkId },
        { enabled: !!frameworkId }
    );

    // Calculate phase status based on tasks
    const getPhaseStatus = (phaseName: string) => {
        const phaseTasks = plan?.tasks?.filter((t: any) => (t.pdca || 'Plan') === phaseName) || [];
        if (phaseTasks.length === 0) return 'upcoming';

        const completedCount = phaseTasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length;
        if (completedCount === phaseTasks.length) return 'completed';

        const inProgressCount = phaseTasks.filter((t: any) => t.status === 'in_progress' || t.status === 'review').length;
        if (inProgressCount > 0 || completedCount > 0) return 'current';

        return 'upcoming';
    };

    const displayPhases = (dbPhases && dbPhases.length > 0) ? dbPhases.map(p => ({
        ...p,
        status: getPhaseStatus(p.name)
    })) : [
        { id: 1, name: 'Plan', status: getPhaseStatus('Plan'), description: "Establish context, policy scope, risk assessment, and baseline controls." },
        { id: 2, name: 'Do', status: getPhaseStatus('Do'), description: "Deploy security countermeasures, configure systems, and implement safeguards." },
        { id: 3, name: 'Check', status: getPhaseStatus('Check'), description: "Monitor telemetry, perform vulnerability audits, and test control effectiveness." },
        { id: 4, name: 'Act', status: getPhaseStatus('Act'), description: "Remediate findings, optimize configurations, and drive continual improvement." }
    ];

    // Counts per phase
    const phaseCounts = useMemo(() => {
        const tasks = plan?.tasks || [];
        return {
            all: tasks.length,
            Plan: tasks.filter((t: any) => (t.pdca || 'Plan') === 'Plan').length,
            Do: tasks.filter((t: any) => t.pdca === 'Do').length,
            Check: tasks.filter((t: any) => t.pdca === 'Check').length,
            Act: tasks.filter((t: any) => t.pdca === 'Act').length,
        };
    }, [plan?.tasks]);

    // Filter tasks by active tab, search query, and status
    const currentTasks = useMemo(() => {
        if (!plan?.tasks) return [];
        let filtered = activeTab === 'all'
            ? plan.tasks
            : plan.tasks.filter((t: any) => (t.pdca || 'Plan') === activeTab);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((t: any) =>
                t.title.toLowerCase().includes(q) ||
                (t.description && t.description.toLowerCase().includes(q)) ||
                (t.nist && t.nist.toLowerCase().includes(q)) ||
                (t.tags && Array.isArray(t.tags) && t.tags.some((tag: string) => tag.toLowerCase().includes(q)))
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter((t: any) => {
                if (statusFilter === 'done') return t.status === 'done' || t.status === 'completed';
                return t.status === statusFilter;
            });
        }

        return filtered;
    }, [plan?.tasks, activeTab, searchQuery, statusFilter]);

    // Overall & Phase metrics
    const overallTotal = plan?.tasks?.length || 0;
    const overallCompleted = plan?.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'done').length || 0;
    const overallProgress = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

    const phaseCompleted = currentTasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length;
    const phaseProgress = currentTasks.length > 0 ? Math.round((phaseCompleted / currentTasks.length) * 100) : 0;

    if (isLoading || loadingPhases) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-medium text-slate-500">Loading implementation plan...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!plan) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                    <p className="text-base font-semibold text-slate-700">Implementation Plan not found</p>
                    <Link href={`/clients/${clientId}/implementation`}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
                        </Button>
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout fullWidth={true}>
            <div className="flex flex-col h-full bg-white">
                {/* Navigation Header */}
                <div className="border-b bg-white/80 backdrop-blur-md px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
                    <div className="flex items-center gap-5">
                        <Link href={`/clients/${clientId}/implementation`}>
                            <div className="group flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-xs font-bold uppercase tracking-wider">Plans</span>
                            </div>
                        </Link>
                        <Separator orientation="vertical" className="h-4 hidden sm:block" />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">{plan.title}</h1>
                                <Badge className="bg-indigo-600 text-white border-0 shadow-xs text-xs">
                                    {plan.framework?.shortCode || "GRC"}
                                </Badge>
                                <Badge variant="outline" className="text-[11px] h-5 bg-slate-50 text-slate-600 border-slate-200 capitalize">
                                    {plan.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                <span>{plan.framework?.name || "Tactical Framework"} Implementation</span>
                                <span>•</span>
                                <span className="font-semibold text-slate-600">{overallCompleted}/{overallTotal} Tasks Completed ({overallProgress}%)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Mode Switcher */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs font-bold bg-white text-slate-900 shadow-xs px-2.5 rounded-md"
                            >
                                <ListTodo className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                Phase View
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setLocation(`/clients/${clientId}/implementation/kanban/${planId}`)}
                                className="h-7 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 rounded-md transition-colors"
                            >
                                <Kanban className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                Kanban Board
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 hidden sm:block" />

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => autoAssignMutation.mutate({ planId })}
                            disabled={autoAssignMutation.isPending}
                            className="bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-bold h-8 text-xs shadow-xs"
                        >
                            {autoAssignMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                                <Wand2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                            )}
                            {autoAssignMutation.isPending ? "Orchestrating..." : "Orchestrate AI Lifecycle"}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setNewTask({ 
                                    title: '', 
                                    description: '', 
                                    priority: 'medium', 
                                    pdca: activeTab === 'all' || activeTab === 'framework' ? 'Plan' : activeTab,
                                    nist: 'Identify'
                                });
                                setAddTaskOpen(true);
                            }}
                            className="font-bold h-8 text-xs border-slate-200 hover:bg-slate-50 shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                            New Task
                        </Button>

                        <PageGuide
                            title="PDCA Tactical Execution"
                            description="Oversee your compliance tasks structured across the Plan-Do-Check-Act lifecycle."
                            rationale="Structuring tasks by PDCA ensures continuous audit readiness and systematic evidence gathering across all controls."
                            howToUse={[
                                { step: "Select Phase or All", description: "Filter by Plan, Do, Check, Act or view the unified plan backlog." },
                                { step: "Task Detail Sheet", description: "Click any task to inspect details, check subtasks, or attach evidence." },
                                { step: "Kanban View", description: "Switch to the Kanban Board to drag and drop items across workflow states." },
                                { step: "AI Lifecycle Orchestration", description: "Decompose compliance requirements into granular tactical deliverables." }
                            ]}
                        />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-6 lg:p-8 w-full font-sans">
                    <div className="grid grid-cols-12 gap-8 items-start">
                        {/* Left Panel: Methodology & Tasks */}
                        <div className="col-span-12 lg:col-span-9 space-y-6">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <TabsList className="bg-slate-100/80 p-1 h-auto gap-1 rounded-xl shadow-xs border border-slate-200/60 flex-wrap">
                                        <TabsTrigger
                                            value="all"
                                            className={cn(
                                                "rounded-lg px-2.5 py-1.5 h-auto text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs",
                                                getPhaseStyle('all')
                                            )}
                                        >
                                            <Layers className="w-3.5 h-3.5" />
                                            All Tasks
                                            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] bg-white/20 text-current font-bold border-0">
                                                {phaseCounts.all}
                                            </Badge>
                                        </TabsTrigger>

                                        {['Plan', 'Do', 'Check', 'Act'].map(phase => (
                                            <TabsTrigger
                                                key={phase}
                                                value={phase}
                                                className={cn(
                                                    "rounded-lg px-2.5 py-1.5 h-auto text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs",
                                                    getPhaseStyle(phase)
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    getPhaseStatus(phase) === 'completed' ? "bg-emerald-500" :
                                                        getPhaseStatus(phase) === 'current' ? "bg-indigo-500 animate-pulse" : "bg-slate-300"
                                                )} />
                                                {phase}
                                                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] bg-white/20 text-current font-bold border-0">
                                                    {phaseCounts[phase as keyof typeof phaseCounts]}
                                                </Badge>
                                            </TabsTrigger>
                                        ))}

                                        <TabsTrigger
                                            value="framework"
                                            className="rounded-lg px-2.5 py-1.5 h-auto text-xs font-bold transition-all flex items-center gap-1.5 ml-0.5 border bg-white text-slate-700 hover:bg-slate-50 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-900 border-slate-200"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                            Methodology
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="text-xs text-slate-400 font-medium hidden md:block">
                                        Phase: <strong className="text-slate-700 uppercase tracking-wide">{activeTab}</strong>
                                    </div>
                                </div>

                                {activeTab !== "framework" ? (
                                    <div className="mt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                            {/* Phase Intelligence Summary Card */}
                                            <Card className="md:col-span-4 border-slate-200 shadow-xs bg-slate-50/50 flex flex-col justify-between">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                                        <span>{activeTab === 'all' ? "Plan Overview" : `${activeTab} Phase Intelligence`}</span>
                                                        <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-600">
                                                            {currentTasks.length} Work Items
                                                        </Badge>
                                                    </CardTitle>
                                                    <CardDescription className="text-xs font-medium text-slate-600 leading-relaxed mt-1">
                                                        {activeTab === 'all' 
                                                            ? "Comprehensive tactical execution backlog across all four continuous improvement phases."
                                                            : (displayPhases.find(p => p.name === activeTab)?.description || "Standard PDCA methodology phase.")}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-5">
                                                    <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/70 shadow-2xs">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-2xl font-black text-slate-900 tabular-nums">{phaseProgress}%</span>
                                                            <span className="text-xs font-bold text-slate-400 uppercase">
                                                                {phaseCompleted}/{currentTasks.length} Completed
                                                            </span>
                                                        </div>
                                                        <Progress value={phaseProgress} className="h-2 bg-slate-100" />
                                                    </div>

                                                    <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                                            <span className="text-xs font-bold text-indigo-900">Compliance Assurance</span>
                                                        </div>
                                                        <p className="text-[11px] text-indigo-800/80 leading-relaxed font-medium">
                                                            {activeTab === 'all'
                                                                ? "Review completed tasks and ensure evidence artifacts are attached prior to scheduling third-party audit inspections."
                                                                : `Focus on completing ${activeTab} deliverables to advance overall audit readiness towards tier 1 compliance.`}
                                                        </p>
                                                    </div>

                                                    {/* Quick Filter Box */}
                                                    <div className="space-y-2 pt-2 border-t border-slate-200">
                                                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search & Filter Tasks</Label>
                                                        <div className="relative">
                                                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                                            <Input
                                                                placeholder="Search tasks..."
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                className="pl-8 h-8 text-xs bg-white border-slate-200"
                                                            />
                                                        </div>
                                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                            <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                                                                <SelectValue placeholder="All Statuses" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">All Statuses</SelectItem>
                                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                                <SelectItem value="todo">To Do</SelectItem>
                                                                <SelectItem value="review">Under Review</SelectItem>
                                                                <SelectItem value="backlog">Backlog</SelectItem>
                                                                <SelectItem value="done">Completed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Task List Card */}
                                            <Card className="md:col-span-8 border-slate-200 shadow-xs overflow-hidden flex flex-col">
                                                <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-700">Work Items</span>
                                                        <Badge variant="secondary" className="text-[10px] font-semibold bg-white border border-slate-200">
                                                            Showing {currentTasks.length}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 font-medium">Click any task to inspect details & attach evidence</span>
                                                </div>

                                                <ScrollArea className="h-[560px]">
                                                    <div className="divide-y divide-slate-100">
                                                        {currentTasks.length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
                                                                <div className="p-3 bg-slate-100 rounded-full">
                                                                    <ListFilter className="w-6 h-6 text-slate-400" />
                                                                </div>
                                                                <div className="space-y-1 max-w-sm">
                                                                    <h4 className="font-bold text-sm text-slate-800">No Tasks Match Filter</h4>
                                                                    <p className="text-xs text-slate-500">
                                                                        {searchQuery || statusFilter !== 'all' 
                                                                            ? "Try clearing your search query or status filter to see more items." 
                                                                            : "Use 'New Task' or 'Orchestrate AI Lifecycle' to generate structured work items."}
                                                                    </p>
                                                                </div>
                                                                {(searchQuery || statusFilter !== 'all') && (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                                                        className="text-xs text-indigo-600 font-bold"
                                                                    >
                                                                        Reset Filters
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            currentTasks.map((task: any) => {
                                                                const isDone = task.status === 'completed' || task.status === 'done';
                                                                const isInProgress = task.status === 'in_progress';
                                                                const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                                                                const completedSubtasks = subtasks.filter((st: any) => st.completed).length;
                                                                const hasEvidence = subtasks.some((st: any) => st.evidenceUrl || st.evidenceId) || 
                                                                    (Array.isArray(task.deliverables) && task.deliverables.length > 0);

                                                                return (
                                                                    <div 
                                                                        key={task.id} 
                                                                        onClick={() => { setSelectedTask(task); setSheetOpen(true); }} 
                                                                        className="p-4 hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                                                    >
                                                                        <div className="flex items-start gap-3.5">
                                                                            <div className="mt-0.5">
                                                                                {isDone ? (
                                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                                                ) : isInProgress ? (
                                                                                    <Clock className="w-5 h-5 text-indigo-500 animate-pulse" />
                                                                                ) : (
                                                                                    <Circle className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1 space-y-1.5 min-w-0">
                                                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                                    <h4 className={cn("font-semibold text-sm text-slate-900 group-hover:text-indigo-900 transition-colors", isDone && "text-slate-400 line-through")}>
                                                                                        {task.title}
                                                                                    </h4>
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <Badge variant="outline" className={cn(
                                                                                            "text-[10px] h-4.5 font-bold uppercase tracking-wider capitalize",
                                                                                            task.priority === 'critical' ? 'border-red-200 text-red-600 bg-red-50' :
                                                                                            task.priority === 'high' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                                                                            'border-slate-200 text-slate-600 bg-white'
                                                                                        )}>
                                                                                            {task.priority || 'medium'}
                                                                                        </Badge>
                                                                                        <Badge variant="outline" className="text-[10px] h-4.5 bg-slate-50 border-slate-200 text-slate-600 capitalize">
                                                                                            {task.status?.replace('_', ' ') || 'todo'}
                                                                                        </Badge>
                                                                                    </div>
                                                                                </div>
                                                                                {task.description && (
                                                                                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                                                                                        {task.description}
                                                                                    </p>
                                                                                )}

                                                                                {/* Badges row: PDCA, NIST, Subtasks, Evidence */}
                                                                                <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                                                    <Badge className={cn("text-[10px] h-4.5 px-1.5 font-semibold border", 
                                                                                        task.pdca === 'Plan' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                                        task.pdca === 'Do' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                                        task.pdca === 'Check' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                                                                        task.pdca === 'Act' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                                                                    )} variant="outline">
                                                                                        {task.pdca || 'Plan'}
                                                                                    </Badge>

                                                                                    {task.nist && (
                                                                                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 text-slate-600 border-slate-200 bg-white">
                                                                                            NIST: {task.nist}
                                                                                        </Badge>
                                                                                    )}

                                                                                    {subtasks.length > 0 && (
                                                                                        <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600">
                                                                                            <CheckSquare className="w-3 h-3 text-slate-500" />
                                                                                            <span>{completedSubtasks}/{subtasks.length} Subtasks</span>
                                                                                        </div>
                                                                                    )}

                                                                                    {hasEvidence ? (
                                                                                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
                                                                                            <Paperclip className="w-3 h-3 mr-1" />
                                                                                            Evidence Attached
                                                                                        </Badge>
                                                                                    ) : (
                                                                                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 border-slate-200 bg-slate-50/70 text-slate-400 font-normal">
                                                                                            <AlertCircle className="w-3 h-3 mr-1 text-slate-400" />
                                                                                            Evidence Pending
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </Card>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-6">
                                        <FrameworkViewRouter
                                            planId={planId}
                                            frameworkName={plan?.framework?.name || plan?.linkedFramework || ""}
                                            tasks={plan?.tasks || []}
                                            phases={displayPhases}
                                            isLoading={isLoading}
                                            frameworkId={frameworkId}
                                        />
                                    </div>
                                )}
                            </Tabs>
                        </div>

                        {/* Right Panel: Sidecar Widgets */}
                        <div className="col-span-12 lg:col-span-3 space-y-6">
                            {/* Harmonization Widget */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Cross-Framework Work Reuse</h3>
                                <HarmonizationAnalyzer
                                    planId={planId}
                                    frameworkId={plan.frameworkId || 0}
                                    planTitle={plan.title}
                                />
                            </div>

                            {/* Audit Readiness */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Audit Governance</h3>
                                <CertificationTracker
                                    clientId={planId}
                                    frameworkId={plan.frameworkId || 0}
                                    frameworkName={plan.framework?.name || "Compliance Framework"}
                                />
                            </div>

                            {/* Quick Metrics */}
                            <Card className="border-slate-200 shadow-xs bg-slate-50/40">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-600">Capacity & Effort</span>
                                        <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-medium">Estimated Workload</span>
                                            <span className="font-bold text-slate-900">{plan.tasks?.reduce((acc: number, t: any) => acc + (t.estimatedHours || 0), 0) || (plan.tasks?.length * 4)} hrs</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-medium">Active Resources</span>
                                            <span className="font-bold text-slate-900">Compliance & Eng Teams</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-medium">Execution Progress</span>
                                            <span className="font-bold text-emerald-600">{overallProgress}%</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                <TaskDetailSheet
                    task={selectedTask}
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    onUpdate={() => {
                        utils.implementation.getPlan.invalidate();
                    }}
                />

                <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Add Implementation Task</DialogTitle>
                            <DialogDescription>
                                Add an engineering or policy task to your {newTask.pdca} continuous improvement phase.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Task Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Deploy MFA enforcement on perimeter VPN"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Actionable implementation instructions or control criteria..."
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>PDCA Phase</Label>
                                    <Select
                                        value={newTask.pdca}
                                        onValueChange={(val) => setNewTask({ ...newTask, pdca: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select phase" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Plan">Plan</SelectItem>
                                            <SelectItem value="Do">Do</SelectItem>
                                            <SelectItem value="Check">Check</SelectItem>
                                            <SelectItem value="Act">Act</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Priority</Label>
                                    <Select
                                        value={newTask.priority}
                                        onValueChange={(val) => setNewTask({ ...newTask, priority: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => createTaskMutation.mutate({
                                    planId,
                                    clientId,
                                    ...newTask
                                })}
                                disabled={!newTask.title || createTaskMutation.isPending}
                            >
                                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
