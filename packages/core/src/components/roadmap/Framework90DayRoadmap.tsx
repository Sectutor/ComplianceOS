import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Progress } from '@complianceos/ui/ui/progress';
import {
    CalendarClock, ArrowRight, CheckCircle2, RotateCcw,
    Shield, ExternalLink, Sparkles, Award, ShieldCheck,
    AlertCircle, Printer, Lock, Target, Download, CalendarDays,
    Clock, AlertTriangle, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { FrameworkRoadmapSpec, RoadmapMonth } from '@/data/frameworkRoadmaps';
import { MilestoneGateModal } from './MilestoneGateModal';
import { RoadmapAuditCertificateModal } from './RoadmapAuditCertificateModal';
import { RoadmapExportModal } from './RoadmapExportModal';

interface Framework90DayRoadmapProps {
    spec: FrameworkRoadmapSpec;
    clientId: number;
    onCustomAction?: (actionKey: string) => void;
    className?: string;
}

function getDaysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function Framework90DayRoadmap({
    spec,
    clientId,
    onCustomAction,
    className
}: Framework90DayRoadmapProps) {
    const [, setLocation] = useLocation();
    const storageKey = `${spec.id}_tasks_${clientId}`;

    const [selectedGateMonth, setSelectedGateMonth] = useState<RoadmapMonth | null>(null);
    const [certModalOpen, setCertModalOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [migratedToServer, setMigratedToServer] = useState(false);

    // ── Server-synced progress ───────────────────────────────────────────────
    const { data: progressData, refetch: refetchProgress } =
        trpc.frameworkRoadmapGates.getRoadmapProgress.useQuery(
            { clientId, frameworkId: spec.id },
            { enabled: !!clientId }
        );

    const toggleRoadmapTask = trpc.frameworkRoadmapGates.toggleRoadmapTask.useMutation({
        onSuccess: (data) => {
            refetchProgress();
        },
        onError: () => {
            toast.error('Failed to save progress. Changes saved locally.');
        }
    });

    const setTargetAuditDate = trpc.frameworkRoadmapGates.setTargetAuditDate.useMutation({
        onSuccess: () => {
            refetchProgress();
            toast.success('Target audit date saved.');
        },
        onError: () => {
            toast.error('Failed to save audit date.');
        }
    });

    // ── Fetch live gate pass and telemetry data from backend ─────────────────
    const { data: gatesData, refetch: refetchGates } = trpc.frameworkRoadmapGates.getMilestoneGates.useQuery(
        { clientId, frameworkId: spec.id },
        { enabled: !!clientId }
    );

    // ── Local state (merged with server) ─────────────────────────────────────
    const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    const [targetDate, setTargetDate] = useState<string>('');

    // ── Sync server → local on first load + one-time localStorage migration ──
    useEffect(() => {
        if (!progressData) return;

        // Build completed map from server data
        const serverMap: Record<string, boolean> = {};
        Object.entries(progressData.completedTasks || {}).forEach(([tid, val]) => {
            serverMap[tid] = !!(val as any)?.completed || !!val;

        });

        if (!migratedToServer) {
            // One-time migration: merge localStorage into server
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const localMap: Record<string, boolean> = JSON.parse(stored);
                    const newTasks: Record<string, boolean> = {};
                    Object.entries(localMap).forEach(([tid, isDone]) => {
                        if (isDone && !serverMap[tid]) {
                            newTasks[tid] = true;
                        }
                    });
                    if (Object.keys(newTasks).length > 0) {
                        toggleRoadmapTask.mutate({
                            clientId,
                            frameworkId: spec.id,
                            taskId: '__migration__',
                            completed: true,
                            batchTasks: newTasks,
                        });
                    }
                    localStorage.removeItem(storageKey);
                }
            } catch {}
            setMigratedToServer(true);
        }

        setCompletedTasks(serverMap);

        if (progressData.targetAuditDate) {
            setTargetDate(progressData.targetAuditDate.slice(0, 10));
        }
    }, [progressData]);

    // ── Auto-verify tasks with live telemetry proof ───────────────────────────
    const taskProof = gatesData?.taskProof || {};
    useEffect(() => {
        if (!progressData || Object.keys(taskProof).length === 0) return;

        const toAutoVerify: Record<string, boolean> = {};
        spec.months.forEach((month) => {
            month.tasks.forEach((task) => {
                const proof = taskProof[task.id];
                const serverMap: Record<string, boolean> = {};
                Object.entries(progressData.completedTasks || {}).forEach(([tid, val]) => {
                    serverMap[tid] = !!(val as any)?.completed || !!val;
                });
                if (proof?.hasProof && !serverMap[task.id]) {
                    toAutoVerify[task.id] = true;
                }
            });
        });

        if (Object.keys(toAutoVerify).length > 0) {
            toggleRoadmapTask.mutate({
                clientId,
                frameworkId: spec.id,
                taskId: '__auto_verify__',
                completed: true,
                batchTasks: toAutoVerify,
            });
        }
    }, [gatesData, progressData]);

    const toggleTask = useCallback((taskId: string, taskTitle?: string) => {
        const isDone = !!completedTasks[taskId];
        const next = !isDone;

        // Optimistic update
        setCompletedTasks((prev) => ({ ...prev, [taskId]: next }));

        toggleRoadmapTask.mutate({
            clientId,
            frameworkId: spec.id,
            taskId,
            completed: next,
            taskTitle,
        });
    }, [completedTasks, clientId, spec.id]);

    const resetRoadmap = () => {
        // Reset optimistically
        setCompletedTasks({});
        // Send batch with all tasks set to false (clearing via empty batchTasks won't work — 
        // we toggle each completed one to false)
        Object.keys(completedTasks).forEach((taskId) => {
            if (completedTasks[taskId]) {
                toggleRoadmapTask.mutate({
                    clientId,
                    frameworkId: spec.id,
                    taskId,
                    completed: false,
                });
            }
        });
        toast.info('Roadmap checklist reset.');
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTargetDate(val);
        if (val) {
            setTargetAuditDate.mutate({
                clientId,
                frameworkId: spec.id,
                targetAuditDate: val,
            });
        }
    };

    // ── Metrics ───────────────────────────────────────────────────────────────
    const totalTasks = spec.months.reduce((acc, m) => acc + m.tasks.length, 0);
    const completedCount = Object.values(completedTasks).filter(Boolean).length;
    const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    const gates = gatesData?.gates || {};
    const passedGatesCount = gatesData?.passedGatesCount || 0;

    const daysUntilAudit = targetDate ? getDaysUntil(targetDate) : null;
    const isOverdue = daysUntilAudit !== null && daysUntilAudit < 0;
    const isUrgent = daysUntilAudit !== null && daysUntilAudit >= 0 && daysUntilAudit <= 14;

    return (
        <div className={cn('space-y-8 w-full', className)}>
            {/* ── Header / Summary Card ─────────────────────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                                {spec.frameworkBadge}
                            </Badge>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold">
                                90-Day Sprint (12 Weeks)
                            </Badge>
                            <Badge className={cn(
                                'text-xs font-bold',
                                passedGatesCount === 3
                                    ? 'bg-emerald-600 text-white'
                                    : passedGatesCount > 0
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-muted text-muted-foreground'
                            )}>
                                {passedGatesCount} / 3 Milestone Gates Passed
                            </Badge>
                        </div>
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <CalendarClock className="w-5 h-5 text-primary shrink-0" />
                            <span>{spec.title}</span>
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{spec.subtitle}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCertModalOpen(true)}
                            className="text-xs font-bold h-9 border-primary/30 text-primary hover:bg-primary/10"
                        >
                            <Award className="w-4 h-4 mr-1.5 text-primary" />
                            Audit Sign-Off Certificate
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExportModalOpen(true)}
                            className="text-xs font-bold h-9 border-border hover:border-primary/30 hover:text-primary"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            Export
                        </Button>

                        <div className="text-right sm:text-left space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Milestones</div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-foreground">{completedCount} / {totalTasks}</span>
                                <span className="text-xs text-muted-foreground font-semibold">({progressPct}%)</span>
                            </div>
                        </div>
                        <div className="w-24 hidden sm:block">
                            <Progress value={progressPct} className="h-2 bg-muted" />
                        </div>
                        {completedCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetRoadmap}
                                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                                title="Reset all checkboxes"
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Target Audit Date Picker ──────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-border/60">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Target className="w-4 h-4 text-primary shrink-0" />
                        <label htmlFor="audit-date-picker" className="text-xs font-bold text-foreground whitespace-nowrap">
                            Target Audit Date
                        </label>
                        <input
                            id="audit-date-picker"
                            type="date"
                            value={targetDate}
                            onChange={handleDateChange}
                            className="text-xs h-8 px-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                        />
                        {targetDate && (
                            <button
                                onClick={() => {
                                    setTargetDate('');
                                    setTargetAuditDate.mutate({ clientId, frameworkId: spec.id, targetAuditDate: null });
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                title="Clear date"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {daysUntilAudit !== null && (
                        <div className={cn(
                            'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border',
                            isOverdue
                                ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300'
                                : isUrgent
                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                        )}>
                            {isOverdue ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                            ) : isUrgent ? (
                                <Zap className="w-3.5 h-3.5" />
                            ) : (
                                <Clock className="w-3.5 h-3.5" />
                            )}
                            {isOverdue
                                ? `${Math.abs(daysUntilAudit)}d overdue`
                                : daysUntilAudit === 0
                                ? 'Audit today!'
                                : `${daysUntilAudit} days to audit`}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Monthly Phases ────────────────────────────────────────────────── */}
            <div className="space-y-6">
                {spec.months.map((month) => {
                    const monthCompleted = month.tasks.filter((t) => completedTasks[t.id]).length;
                    const isAllMonthComplete = monthCompleted === month.tasks.length;
                    const gate = gates[month.month];
                    const isGatePassed = !!gate?.passed;
                    const monthVerifiedCount = month.tasks.filter(t => taskProof[t.id]?.hasProof).length;

                    // Per-month countdown badge
                    const monthDaysLeft = targetDate
                        ? getDaysUntil(targetDate) - (3 - month.month) * 30
                        : null;

                    return (
                        <Card key={month.month} className="border-border rounded-2xl overflow-hidden shadow-md">
                            <CardHeader className={cn('border-b p-6', month.bgLight, month.borderColor)}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={cn('font-bold text-xs', month.badgeColor)}>
                                                {month.badgeText}
                                            </Badge>
                                            {isGatePassed ? (
                                                <Badge className="bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                                                    <Lock className="w-3 h-3" /> Gate Passed &amp; Locked
                                                </Badge>
                                            ) : isAllMonthComplete ? (
                                                <Badge className="bg-blue-600 text-white font-bold text-[10px] flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Ready For Gate Sign-Off
                                                </Badge>
                                            ) : null}
                                            {monthDaysLeft !== null && !isGatePassed && (
                                                <Badge className={cn(
                                                    'text-[10px] font-bold flex items-center gap-1',
                                                    monthDaysLeft < 0
                                                        ? 'bg-red-600 text-white'
                                                        : monthDaysLeft <= 7
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-foreground'
                                                )}>
                                                    <CalendarDays className="w-2.5 h-2.5" />
                                                    {monthDaysLeft < 0
                                                        ? `${Math.abs(monthDaysLeft)}d past deadline`
                                                        : `${monthDaysLeft}d left`}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardTitle className="text-lg font-bold text-foreground">
                                            {month.title}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-md bg-white/60 dark:bg-black/20 border border-border/50', month.textColor)}>
                                            {month.clauseRef}
                                        </span>
                                        <span className="text-xs font-bold text-muted-foreground">
                                            {monthCompleted}/{month.tasks.length} Done
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-3.5">
                                {month.tasks.map((task) => {
                                    const isDone = !!completedTasks[task.id];
                                    const proof = taskProof[task.id];
                                    const hasLiveProof = !!proof?.hasProof;
                                    const isAutoVerified = hasLiveProof && isDone;

                                    return (
                                        <div
                                            key={task.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
                                        >
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    id={task.id}
                                                    checked={isDone}
                                                    onChange={() => toggleTask(task.id, task.title)}
                                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 shrink-0 cursor-pointer"
                                                />
                                                <label htmlFor={task.id} className="cursor-pointer flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={cn('text-sm font-bold', isDone ? 'line-through text-muted-foreground' : 'text-foreground')}>
                                                            {task.title}
                                                        </span>
                                                        {task.articleRef && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-muted-foreground/30 text-muted-foreground font-semibold">
                                                                {task.articleRef}
                                                            </Badge>
                                                        )}
                                                        {/* Live Telemetry / Auto-Verified Badge */}
                                                        {isAutoVerified ? (
                                                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                                                                <Zap className="w-2.5 h-2.5 mr-1" />
                                                                Auto-Verified by Evidence
                                                            </span>
                                                        ) : hasLiveProof ? (
                                                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300">
                                                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                                {proof.label}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-100/70 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-300">
                                                                <AlertCircle className="w-2.5 h-2.5 mr-1" />
                                                                Manual / External Proof
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed font-normal">
                                                        {task.desc}
                                                    </p>
                                                </label>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    if (task.action && onCustomAction) {
                                                        onCustomAction(task.action);
                                                    } else if (task.link && task.link !== '#') {
                                                        const currentUrl = window.location.pathname + (window.location.search || '');
                                                        const roadmapLabel = spec.shortTitle || spec.title || '90-Day Roadmap';
                                                        try {
                                                            sessionStorage.setItem('cos_roadmap_return_nav', JSON.stringify({
                                                                url: currentUrl,
                                                                label: roadmapLabel,
                                                                frameworkId: spec.id,
                                                                taskId: task.id,
                                                                taskTitle: task.title,
                                                                timestamp: Date.now()
                                                            }));
                                                        } catch (e) {}

                                                        const targetUrl = task.link;
                                                        const separator = targetUrl.includes('?') ? '&' : '?';
                                                        const destination = `${targetUrl}${separator}returnTo=${encodeURIComponent(currentUrl)}&returnLabel=${encodeURIComponent(roadmapLabel)}&frameworkId=${encodeURIComponent(spec.id)}&taskId=${encodeURIComponent(task.id)}&taskTitle=${encodeURIComponent(task.title)}`;
                                                        setLocation(destination);
                                                    }
                                                }}
                                                className="text-xs font-semibold h-8 shrink-0 whitespace-nowrap self-start sm:self-center hover:border-primary/50 transition-colors"
                                            >
                                                {task.cta}
                                                <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                            </Button>
                                        </div>
                                    );
                                })}

                                {/* Month-End Milestone Gate Footer */}
                                <div className={cn(
                                    'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 transition-all',
                                    isGatePassed
                                        ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/20'
                                        : 'bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 border-amber-200 dark:bg-amber-950/20'
                                )}>
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={cn('p-2 rounded-xl shrink-0 mt-0.5', isGatePassed ? 'bg-emerald-600 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm')}>
                                            {isGatePassed ? <ShieldCheck className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h5 className="font-bold text-sm text-foreground">
                                                    {isGatePassed ? `Month ${month.month} Milestone Passed & Audit Locked` : `Month ${month.month} Phase Gate`}
                                                </h5>
                                                {isGatePassed && (
                                                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                                        Passed by {gate.passedBy}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                {isGatePassed
                                                    ? `Attested on ${new Date(gate.passedAt).toLocaleDateString()} at ${new Date(gate.passedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                                                    : `Verifiable gate: ${monthVerifiedCount} of ${month.tasks.length} live database proof points detected. Lead Implementer sign-off required.`}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant={isGatePassed ? 'outline' : 'default'}
                                        onClick={() => setSelectedGateMonth(month)}
                                        className={cn(
                                            'text-xs font-bold shrink-0 whitespace-nowrap self-start sm:self-center h-8',
                                            isGatePassed
                                                ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300'
                                                : 'bg-slate-900 text-white shadow-sm hover:bg-slate-800'
                                        )}
                                    >
                                        {isGatePassed ? 'View Audit Record' : `Review & Pass Month ${month.month} Gate`}
                                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ── Modal: Pass Milestone Gate ────────────────────────────────────── */}
            {selectedGateMonth && (
                <MilestoneGateModal
                    isOpen={!!selectedGateMonth}
                    onClose={() => setSelectedGateMonth(null)}
                    clientId={clientId}
                    frameworkId={spec.id}
                    month={selectedGateMonth}
                    taskProof={taskProof}
                    gateData={gates[selectedGateMonth.month]}
                    onGatePassed={() => refetchGates()}
                />
            )}

            {/* ── Modal: Official Audit Certificate ─────────────────────────────── */}
            <RoadmapAuditCertificateModal
                isOpen={certModalOpen}
                onClose={() => setCertModalOpen(false)}
                clientId={clientId}
                spec={spec}
            />

            {/* ── Modal: Export ─────────────────────────────────────────────────── */}
            <RoadmapExportModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                spec={spec}
                clientId={clientId}
                completedTasks={completedTasks}
                gates={gates}
                targetAuditDate={targetDate || null}
            />
        </div>
    );
}
