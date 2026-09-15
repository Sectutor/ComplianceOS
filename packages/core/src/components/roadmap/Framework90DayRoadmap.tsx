import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Progress } from '@complianceos/ui/ui/progress';
import {
    CalendarClock, ArrowRight, CheckCircle2, RotateCcw,
    Shield, ExternalLink, Sparkles, Award, ShieldCheck,
    AlertCircle, Printer, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { FrameworkRoadmapSpec, RoadmapMonth } from '@/data/frameworkRoadmaps';
import { MilestoneGateModal } from './MilestoneGateModal';
import { RoadmapAuditCertificateModal } from './RoadmapAuditCertificateModal';

interface Framework90DayRoadmapProps {
    spec: FrameworkRoadmapSpec;
    clientId: number;
    onCustomAction?: (actionKey: string) => void;
    className?: string;
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

    // Fetch live gate pass and telemetry data from backend
    const { data: gatesData, refetch: refetchGates } = trpc.frameworkRoadmapGates.getMilestoneGates.useQuery(
        { clientId, frameworkId: spec.id },
        { enabled: !!clientId }
    );

    const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            setCompletedTasks(stored ? JSON.parse(stored) : {});
        } catch {
            setCompletedTasks({});
        }
    }, [storageKey]);

    const toggleTask = (taskId: string) => {
        setCompletedTasks((prev) => {
            const next = { ...prev, [taskId]: !prev[taskId] };
            try {
                localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {}
            return next;
        });
    };

    const resetRoadmap = () => {
        setCompletedTasks({});
        try {
            localStorage.removeItem(storageKey);
            toast.info("Roadmap checklist reset.");
        } catch {}
    };

    // Calculate completion metrics
    const totalTasks = spec.months.reduce((acc, m) => acc + m.tasks.length, 0);
    const completedCount = Object.values(completedTasks).filter(Boolean).length;
    const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    const taskProof = gatesData?.taskProof || {};
    const gates = gatesData?.gates || {};
    const passedGatesCount = gatesData?.passedGatesCount || 0;

    return (
        <div className={cn("space-y-8 w-full", className)}>
            {/* Header / Summary Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                            {spec.frameworkBadge}
                        </Badge>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold">
                            90-Day Sprint (12 Weeks)
                        </Badge>
                        <Badge className={cn(
                            "text-xs font-bold",
                            passedGatesCount === 3
                                ? "bg-emerald-600 text-white"
                                : passedGatesCount > 0
                                ? "bg-blue-600 text-white"
                                : "bg-muted text-muted-foreground"
                        )}>
                            {passedGatesCount} / 3 Milestone Gates Passed
                        </Badge>
                    </div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <CalendarClock className="w-5 h-5 text-primary shrink-0" />
                        <span>{spec.title}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {spec.subtitle}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                    {/* Official Audit Certificate Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCertModalOpen(true)}
                        className="text-xs font-bold h-9 border-primary/30 text-primary hover:bg-primary/10"
                    >
                        <Award className="w-4 h-4 mr-1.5 text-primary" />
                        Audit Sign-Off Certificate
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

            {/* Monthly Phases */}
            <div className="space-y-6">
                {spec.months.map((month) => {
                    const monthCompleted = month.tasks.filter((t) => completedTasks[t.id]).length;
                    const isAllMonthComplete = monthCompleted === month.tasks.length;
                    const gate = gates[month.month];
                    const isGatePassed = !!gate?.passed;
                    const monthVerifiedCount = month.tasks.filter(t => taskProof[t.id]?.hasProof).length;

                    return (
                        <Card key={month.month} className="border-border rounded-2xl overflow-hidden shadow-md">
                            <CardHeader className={cn("border-b p-6", month.bgLight, month.borderColor)}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={cn("font-bold text-xs", month.badgeColor)}>
                                                {month.badgeText}
                                            </Badge>
                                            {isGatePassed ? (
                                                <Badge className="bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                                                    <Lock className="w-3 h-3" /> Gate Passed & Locked
                                                </Badge>
                                            ) : isAllMonthComplete ? (
                                                <Badge className="bg-blue-600 text-white font-bold text-[10px] flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Ready For Gate Sign-Off
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <CardTitle className="text-lg font-bold text-foreground">
                                            {month.title}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md bg-white/60 dark:bg-black/20 border border-border/50", month.textColor)}>
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
                                                    onChange={() => toggleTask(task.id)}
                                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 shrink-0 cursor-pointer"
                                                />
                                                <label htmlFor={task.id} className="cursor-pointer flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={cn("text-sm font-bold", isDone ? "line-through text-muted-foreground" : "text-foreground")}>
                                                            {task.title}
                                                        </span>
                                                        {task.articleRef && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-muted-foreground/30 text-muted-foreground font-semibold">
                                                                {task.articleRef}
                                                            </Badge>
                                                        )}
                                                        {/* Live Telemetry Proof Badge */}
                                                        {hasLiveProof ? (
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
                                                                timestamp: Date.now()
                                                            }));
                                                        } catch (e) {}

                                                        const targetUrl = task.link;
                                                        const separator = targetUrl.includes('?') ? '&' : '?';
                                                        const destination = `${targetUrl}${separator}returnTo=${encodeURIComponent(currentUrl)}&returnLabel=${encodeURIComponent(roadmapLabel)}`;
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
                                    "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 transition-all",
                                    isGatePassed
                                        ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/20"
                                        : "bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 border-amber-200 dark:bg-amber-950/20"
                                )}>
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", isGatePassed ? "bg-emerald-600 text-white shadow-sm" : "bg-amber-500 text-white shadow-sm")}>
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
                                        variant={isGatePassed ? "outline" : "default"}
                                        onClick={() => setSelectedGateMonth(month)}
                                        className={cn(
                                            "text-xs font-bold shrink-0 whitespace-nowrap self-start sm:self-center h-8",
                                            isGatePassed
                                                ? "border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300"
                                                : "bg-slate-900 text-white shadow-sm hover:bg-slate-800"
                                        )}
                                    >
                                        {isGatePassed ? "View Audit Record" : `Review & Pass Month ${month.month} Gate`}
                                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Modal: Pass Milestone Gate */}
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

            {/* Modal: Official Audit Certificate */}
            <RoadmapAuditCertificateModal
                isOpen={certModalOpen}
                onClose={() => setCertModalOpen(false)}
                clientId={clientId}
                spec={spec}
            />
        </div>
    );
}
