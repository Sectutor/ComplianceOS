import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from "@complianceos/ui/ui/badge";
import { 
  MoreHorizontal, 
  Plus, 
  Calendar, 
  Filter, 
  Layers, 
  ShieldCheck, 
  Target, 
  RefreshCw,
  Search,
  ArrowLeft,
  ListTodo,
  Kanban,
  Paperclip,
  CheckSquare,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { Button } from "@complianceos/ui/ui/button";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@complianceos/ui/ui/dialog";
import { Progress } from "@complianceos/ui/ui/progress";
import { Separator } from "@complianceos/ui/ui/separator";
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { TaskDetailSheet } from './TaskDetailSheet';
import { PageGuide } from "@/components/PageGuide";

interface ImplementationKanbanProps {
  clientId: number;
  planId: number;
}

type PDCA = 'Plan' | 'Do' | 'Check' | 'Act';
type NISTInput = 'Govern' | 'Identify' | 'Protect' | 'Detect' | 'Respond' | 'Recover';

type Task = {
  id: string;
  title: string;
  description?: string;
  tag: string;
  priority: string;
  date: string;
  pdca: PDCA;
  nist: NISTInput;
  status: string;
  subtaskCount: number;
  completedSubtasks: number;
  hasEvidence: boolean;
};

type ColumnType = 'backlog' | 'todo' | 'inprogress' | 'review' | 'done';

const columnTitles: Record<ColumnType, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  inprogress: 'In Progress',
  review: 'Under Review',
  done: 'Completed'
};

const pdcaColors: Record<PDCA, string> = {
  Plan: 'bg-blue-100 text-blue-700 border-blue-200',
  Do: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Check: 'bg-amber-100 text-amber-700 border-amber-200',
  Act: 'bg-purple-100 text-purple-700 border-purple-200'
};

const nistColors: Record<NISTInput, string> = {
  Govern: 'bg-slate-100 text-slate-700',
  Identify: 'bg-yellow-100 text-yellow-700',
  Protect: 'bg-green-100 text-green-700',
  Detect: 'bg-orange-100 text-orange-700',
  Respond: 'bg-red-100 text-red-700',
  Recover: 'bg-teal-100 text-teal-700'
};

export default function ImplementationKanban({ clientId, planId }: ImplementationKanbanProps) {
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<Record<ColumnType, Task[]>>({
    backlog: [], todo: [], inprogress: [], review: [], done: []
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'none' | 'pdca' | 'nist'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sheet & Dialog state
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState<ColumnType>('todo');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    pdca: 'Plan',
    nist: 'Identify'
  });

  const utils = trpc.useContext();

  const { data: plan } = trpc.implementation.getPlan.useQuery({
    planId
  }, { enabled: !!planId });

  const { data: serverTasks, isLoading, refetch } = trpc.implementation.getPlanTasks.useQuery({
    planId: planId
  }, { enabled: !!planId });

  const updateStatusMutation = trpc.implementation.updateTaskStatus.useMutation({
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
      refetch();
    }
  });

  const createTaskMutation = trpc.implementation.createTask.useMutation({
    onSuccess: () => {
      refetch();
      utils.implementation.getPlan.invalidate();
      setAddTaskOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', pdca: 'Plan', nist: 'Identify' });
      toast.success("Task added to board");
    },
    onError: (err) => {
      toast.error(`Failed to create task: ${err.message}`);
    }
  });

  useEffect(() => {
    if (serverTasks) {
      const grouped: Record<ColumnType, Task[]> = {
        backlog: [], todo: [], inprogress: [], review: [], done: []
      };
      serverTasks.forEach(t => {
        let col: ColumnType = 'todo';
        if (t.status === 'backlog') col = 'backlog';
        else if (t.status === 'in_progress') col = 'inprogress';
        else if (t.status === 'review') col = 'review';
        else if (t.status === 'done' || t.status === 'completed') col = 'done';

        const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
        const hasEvidence = subtasks.some((st: any) => st.evidenceUrl || st.evidenceId) || 
          (Array.isArray(t.deliverables) && t.deliverables.length > 0);

        grouped[col].push({
          id: t.id.toString(),
          title: t.title,
          description: t.description || '',
          tag: (t.tags as string[])?.[0] || 'Implementation',
          priority: t.priority || 'medium',
          date: t.plannedEndDate ? format(new Date(t.plannedEndDate), 'MMM d') : 'Variable',
          pdca: (t.pdca as PDCA) || 'Plan',
          nist: (t.nist as NISTInput) || 'Identify',
          status: t.status || 'todo',
          subtaskCount: subtasks.length,
          completedSubtasks: subtasks.filter((st: any) => st.completed).length,
          hasEvidence
        });
      });
      setTasks(grouped);
    }
  }, [serverTasks]);

  // Filter tasks by searchQuery
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase().trim();
    const result: Record<ColumnType, Task[]> = {
      backlog: [], todo: [], inprogress: [], review: [], done: []
    };
    (Object.keys(tasks) as ColumnType[]).forEach(col => {
      result[col] = tasks[col].filter(t => 
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.nist.toLowerCase().includes(q) ||
        t.priority.toLowerCase().includes(q)
      );
    });
    return result;
  }, [tasks, searchQuery]);

  // Total task stats
  const totalCount = (serverTasks || []).length;
  const completedCount = (serverTasks || []).filter(t => t.status === 'done' || t.status === 'completed').length;
  const inProgressCount = (serverTasks || []).filter(t => t.status === 'in_progress').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id: string): ColumnType | undefined => {
    if (Object.keys(tasks).includes(id)) return id as ColumnType;
    return (Object.keys(tasks) as ColumnType[]).find((key) =>
      tasks[key].find((item) => item.id === id)
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overId = over?.id;
    if (!overId || active.id === overId) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(overId as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setTasks((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((item) => item.id === active.id);
      const overIndex = overItems.findIndex((item) => item.id === overId);

      let newIndex;
      if (overId in prev) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: [...prev[activeContainer].filter((item) => item.id !== active.id)],
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          activeItems[activeIndex],
          ...prev[overContainer].slice(newIndex, prev[overContainer].length),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId) {
      setActiveId(null);
      return;
    }

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(overId as string);

    if (activeContainer && overContainer) {
      if (activeContainer !== overContainer) {
        let dbStatus: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' = 'todo';
        if (overContainer === 'backlog') dbStatus = 'backlog';
        else if (overContainer === 'inprogress') dbStatus = 'in_progress';
        else if (overContainer === 'review') dbStatus = 'review';
        else if (overContainer === 'done') dbStatus = 'done';

        updateStatusMutation.mutate({
          taskId: parseInt(active.id as string, 10),
          status: dbStatus
        });
      }

      if (activeContainer === overContainer) {
        const activeIndex = tasks[activeContainer].findIndex((item) => item.id === active.id);
        const overIndex = tasks[overContainer].findIndex((item) => item.id === overId);

        if (activeIndex !== overIndex) {
          setTasks((prev) => ({
            ...prev,
            [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
          }));
        }
      }
    }

    setActiveId(null);
  };

  const handleTaskClick = (task: Task) => {
    const rawTask = serverTasks?.find(t => t.id.toString() === task.id);
    if (rawTask) {
      setSelectedTask(rawTask);
      setSheetOpen(true);
    }
  };

  const openAddTask = (column: ColumnType) => {
    setTargetColumn(column);
    setAddTaskOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Loading Kanban Task Board...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-5">
      {/* Executive Command Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href={`/clients/${clientId}/implementation`}>
            <div className="group flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-wider">Plans</span>
            </div>
          </Link>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                {plan?.title || "Implementation Task Board"}
              </h1>
              <Badge className="bg-indigo-600 text-white border-0 text-xs">
                {plan?.framework?.shortCode || "GRC"}
              </Badge>
              <Badge variant="outline" className="text-[11px] h-5 bg-slate-50 text-slate-600 border-slate-200 capitalize">
                {plan?.status || 'in_progress'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{completedCount}/{totalCount} Completed ({progressPercent}%)</span>
              <span>•</span>
              <span className="text-indigo-600 font-medium">{inProgressCount} in progress</span>
            </div>
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLocation(`/clients/${clientId}/implementation/plan/${planId}`)}
              className="h-7 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 rounded-md transition-colors"
            >
              <ListTodo className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Phase View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs font-bold bg-white text-slate-900 shadow-xs px-2.5 rounded-md"
            >
              <Kanban className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Kanban Board
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs w-[160px] md:w-[200px] bg-white border-slate-200"
            />
          </div>

          {/* Group By Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 hidden xl:inline">Group:</span>
            <Select value={groupBy} onValueChange={(val: any) => setGroupBy(val)}>
              <SelectTrigger className="w-[125px] h-8 text-xs bg-white border-slate-200">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Standard</SelectItem>
                <SelectItem value="pdca">PDCA Phase</SelectItem>
                <SelectItem value="nist">NIST CSF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => openAddTask('todo')}
            className="font-bold h-8 text-xs border-slate-200 hover:bg-slate-50 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            New Task
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-slate-600" 
            onClick={() => refetch()}
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updateStatusMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* DND Board Container */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="h-[calc(100vh-270px)] min-h-[500px] overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-5 min-w-[1300px] h-full">
            {(Object.keys(filteredTasks) as ColumnType[]).map((columnId) => (
              <KanbanColumn
                key={columnId}
                id={columnId}
                title={columnTitles[columnId]}
                tasks={filteredTasks[columnId]}
                groupBy={groupBy}
                onTaskClick={handleTaskClick}
                onAddTask={() => openAddTask(columnId)}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <TaskCard task={findActionTask(tasks, activeId)} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Integrated Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={() => {
          refetch();
          utils.implementation.getPlan.invalidate();
        }}
      />

      {/* Create Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Kanban Task</DialogTitle>
            <DialogDescription>
              Create a task in the <strong>{columnTitles[targetColumn]}</strong> column.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                placeholder="e.g. Conduct third-party penetration test"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Execution instructions or control verification notes..."
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
              onClick={() => {
                let dbStatus: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' = 'todo';
                if (targetColumn === 'backlog') dbStatus = 'backlog';
                else if (targetColumn === 'inprogress') dbStatus = 'in_progress';
                else if (targetColumn === 'review') dbStatus = 'review';
                else if (targetColumn === 'done') dbStatus = 'done';

                createTaskMutation.mutate({
                  planId,
                  clientId,
                  title: newTask.title,
                  description: newTask.description,
                  priority: newTask.priority,
                  pdca: newTask.pdca,
                  nist: newTask.nist,
                  status: dbStatus
                });
              }}
              disabled={!newTask.title || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanColumn({ 
  id, 
  title, 
  tasks, 
  groupBy,
  onTaskClick,
  onAddTask
}: { 
  id: ColumnType; 
  title: string; 
  tasks: Task[]; 
  groupBy: 'none' | 'pdca' | 'nist';
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
}) {
  const { setNodeRef } = useDroppable({ id });

  const columnStyles: Record<ColumnType, string> = {
    backlog: 'bg-slate-50/80 border-slate-200 border-t-slate-400',
    todo: 'bg-blue-50/40 border-blue-200 border-t-blue-500',
    inprogress: 'bg-amber-50/40 border-amber-200 border-t-amber-500',
    review: 'bg-purple-50/40 border-purple-200 border-t-purple-500',
    done: 'bg-emerald-50/40 border-emerald-200 border-t-emerald-500'
  };

  const headerStyles: Record<ColumnType, string> = {
    backlog: 'bg-slate-100/60 border-slate-200 text-slate-700',
    todo: 'bg-blue-100/40 border-blue-200 text-blue-900',
    inprogress: 'bg-amber-100/40 border-amber-200 text-amber-900',
    review: 'bg-purple-100/40 border-purple-200 text-purple-900',
    done: 'bg-emerald-100/40 border-emerald-200 text-emerald-900'
  };

  return (
    <div ref={setNodeRef} className={`w-80 flex-shrink-0 flex flex-col h-full rounded-2xl border border-t-4 shadow-2xs ${columnStyles[id]}`}>
      <div className={`px-4 py-3 flex items-center justify-between border-b rounded-t-xl backdrop-blur-xs ${headerStyles[id]}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider">{title}</h3>
          <Badge variant="secondary" className="rounded-full bg-white/80 text-slate-800 text-[10px] font-bold px-1.5 h-4 shadow-2xs border-0">
            {tasks.length}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-md" 
          onClick={onAddTask}
          title={`Add task to ${title}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar">
        <SortableContext id={id} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableItem key={task.id} task={task} groupBy={groupBy} onTaskClick={onTaskClick} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-32 border-2 border-dashed border-slate-300/60 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
            <span className="font-medium">No items</span>
            <span className="text-[10px] text-slate-400 mt-1">Drag tasks here or click + to add</span>
          </div>
        )}
      </div>
    </div>
  );
}

function findActionTask(tasks: Record<ColumnType, Task[]>, id: string): Task | undefined {
  for (const key of Object.keys(tasks)) {
    const task = tasks[key as ColumnType].find(t => t.id === id);
    if (task) return task;
  }
  return undefined;
}

function SortableItem({ 
  task, 
  groupBy,
  onTaskClick
}: { 
  task: Task; 
  groupBy?: 'none' | 'pdca' | 'nist';
  onTaskClick: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} groupBy={groupBy} onClick={() => onTaskClick(task)} />
    </div>
  );
}

function TaskCard({ 
  task, 
  isOverlay, 
  groupBy = 'none',
  onClick
}: { 
  task: Task | undefined; 
  isOverlay?: boolean; 
  groupBy?: 'none' | 'pdca' | 'nist';
  onClick?: () => void;
}) {
  if (!task) return null;

  const isDone = task.status === 'done' || task.status === 'completed';

  return (
    <div 
      onClick={(e) => {
        if (!isOverlay && onClick) {
          onClick();
        }
      }}
      className={`
        bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs 
        ${isOverlay ? 'shadow-2xl scale-105 rotate-1.5 cursor-grabbing' : 'hover:shadow-md hover:border-indigo-300 cursor-grab active:cursor-grabbing'}
        transition-all group relative overflow-hidden
      `}
    >
      {groupBy === 'pdca' && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${pdcaColors[task.pdca]?.replace('bg-', 'bg-').split(' ')[0].replace('100', '500') || 'bg-blue-500'}`} />
      )}

      {/* Header tags & Action */}
      <div className="flex justify-between items-start mb-2 pl-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`
            text-[9px] uppercase tracking-wider font-bold h-4 px-1.5
            ${task.priority === 'critical' ? 'border-red-200 text-red-600 bg-red-50' :
              task.priority === 'high' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                'border-slate-200 text-slate-600 bg-slate-50'}
          `}>
            {task.priority}
          </Badge>
          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[110px]">
            {task.tag}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 -mr-1 -mt-0.5 rounded-sm"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          title="Inspect Task"
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>

      {/* Title */}
      <h4 className={`font-semibold text-slate-900 text-xs mb-2.5 leading-snug pl-1.5 line-clamp-2 ${isDone ? 'line-through text-slate-400' : ''}`}>
        {task.title}
      </h4>

      {/* Middle Badges: PDCA & NIST */}
      <div className="flex flex-wrap gap-1.5 mb-2.5 pl-1.5">
        <Badge className={`text-[9px] h-4.5 px-1.5 font-semibold border ${pdcaColors[task.pdca] || 'bg-slate-100 text-slate-700'}`} variant="outline">
          {task.pdca}
        </Badge>
        {task.nist && (
          <Badge className={`text-[9px] h-4.5 px-1.5 font-semibold border ${nistColors[task.nist] || 'bg-slate-100 text-slate-700'}`} variant="outline">
            {task.nist}
          </Badge>
        )}
      </div>

      {/* Footer Row: Subtasks, Evidence, Date */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 pl-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          {task.subtaskCount > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-600">
              <CheckSquare className="w-2.5 h-2.5 text-slate-400" />
              <span>{task.completedSubtasks}/{task.subtaskCount}</span>
            </div>
          )}

          {task.hasEvidence ? (
            <span className="flex items-center text-emerald-600 font-semibold" title="Evidence attached">
              <Paperclip className="w-2.5 h-2.5 mr-0.5" />
              Evidence
            </span>
          ) : (
            <span className="flex items-center text-slate-400" title="Evidence needed">
              <AlertCircle className="w-2.5 h-2.5 mr-0.5 text-slate-300" />
              Pending
            </span>
          )}
        </div>

        <div className="flex items-center">
          <Calendar className="w-2.5 h-2.5 mr-1 text-slate-300" />
          {task.date}
        </div>
      </div>
    </div>
  );
}