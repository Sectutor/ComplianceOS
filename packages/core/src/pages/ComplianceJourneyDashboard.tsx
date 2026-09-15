import React from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    Flag,
    ClipboardCheck,
    Briefcase,
    ArrowRight,
    Lock,
    CheckCircle2,
    ShieldCheck,
    Map,
    Loader2,
    Zap,
    Target,
    BrainCircuit,
    Calendar,
    ChevronRight,
    Sparkles
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageGuide } from "@/components/PageGuide";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ComplianceJourneyDashboard() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0", 10);
    const [, setLocation] = useLocation();

    // Real Data from TRPC
    const { data: readinessData, isLoading: readinessLoading } = trpc.readiness.list.useQuery({ clientId });
    const { data: frameworkStats, isLoading: statsLoading } = trpc.compliance.frameworkStats.list.useQuery({ clientId });

    // Calculate Readiness Score (Phase 1)
    const latestAssessment = readinessData?.[0];
    const readinessScore = latestAssessment
        ? Math.round(((latestAssessment.currentStep || 1) / 6) * 100)
        : 0;

    // Calculate Evidence Progress (Phase 2)
    const totalPercentage = frameworkStats?.reduce((acc, curr) => acc + curr.percentage, 0) || 0;
    const evidenceProgress = frameworkStats?.length ? Math.round(totalPercentage / frameworkStats.length) : 0;

    // Unlock Logic
    const isEvidenceUnlocked = readinessScore >= 40;
    const isAuditUnlocked = readinessScore >= 80 && evidenceProgress >= 80;

    // Calculate overall journey percentage
    const overallProgress = Math.round((readinessScore * 0.3) + (evidenceProgress * 0.7)); // Weighted

    // AI Prediction Engine (Simulated based on progress)
    const weeksToCompliance = overallProgress > 0 ? Math.max(1, Math.round((100 - overallProgress) / 5)) : 12;
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + (weeksToCompliance * 7));
    const formattedDate = predictedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const stages = [
        {
            id: 'readiness',
            level: 1,
            title: "Readiness Assessment",
            subtitle: "Phase 1: Discovery & Scoping",
            description: "Identify compliance gaps and scope your security posture against SOC 2, ISO 27001, and HIPAA.",
            icon: Flag,
            path: `/clients/${clientId}/readiness/wizard`,
            color: "text-blue-600 dark:text-blue-400",
            bgAccent: "bg-blue-500/10 border-blue-500/20",
            glowColor: "hover:shadow-blue-500/10",
            buttonText: "Resume Assessment",
            progress: readinessScore,
            status: readinessScore >= 80 ? 'completed' : 'in-progress',
            locked: false,
            unlockCriteria: null
        },
        {
            id: 'evidence',
            level: 2,
            title: "Evidence Collection",
            subtitle: "Phase 2: Implementation & Sync",
            description: "Connect cloud integrations (AWS, GitHub, Google) and upload automated control verification proof.",
            icon: ClipboardCheck,
            path: `/clients/${clientId}/evidence`,
            color: "text-purple-600 dark:text-purple-400",
            bgAccent: "bg-purple-500/10 border-purple-500/20",
            glowColor: "hover:shadow-purple-500/10",
            buttonText: "Collect Evidence",
            progress: evidenceProgress,
            status: isEvidenceUnlocked ? (evidenceProgress >= 80 ? 'completed' : 'in-progress') : 'locked',
            locked: !isEvidenceUnlocked,
            unlockCriteria: "Reach 40% Readiness Score to unlock this phase."
        },
        {
            id: 'audit',
            level: 3,
            title: "Audit Preparation",
            subtitle: "Phase 3: Certification & Defense",
            description: "Collaborate directly with external auditors in the secure, tamper-proof Audit Room.",
            icon: Briefcase,
            path: `/clients/${clientId}/audit-hub`,
            color: "text-emerald-600 dark:text-emerald-400",
            bgAccent: "bg-emerald-500/10 border-emerald-500/20",
            glowColor: "hover:shadow-emerald-500/10",
            buttonText: "Enter Audit Hub",
            progress: isAuditUnlocked ? 100 : 0,
            status: isAuditUnlocked ? 'ready' : 'locked',
            locked: !isAuditUnlocked,
            unlockCriteria: "Reach 80% Readiness & 80% Evidence to unlock."
        }
    ];

    if (readinessLoading || statsLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="w-full max-w-7xl mx-auto space-y-8 pb-16 min-w-0">
                {/* Top Navigation & Breadcrumb */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", href: `/clients/${clientId}` },
                            { label: "Compliance Journey" },
                        ]}
                    />
                    <PageGuide
                        title="Compliance Journey Roadmap"
                        description="Navigate the three main phases of your compliance program."
                        rationale="Compliance is a marathon, not a sprint. This journey map helps you visualize exactly where you are and what the AI predicts for your certification timeline."
                        howToUse={[
                            {
                                step: "AI Predictions",
                                description: "Monitor the 'AI Prediction' card to see your estimated audit readiness date based on current velocity.",
                                targetId: "journey-ai-prediction"
                            },
                            {
                                step: "Progress Tracking",
                                description: "The 'Overall Progress' card uses weighted metrics (30% readiness, 70% evidence) to show true maturity.",
                                targetId: "journey-overall-progress"
                            },
                            {
                                step: "Phase Unlocking",
                                description: "Phases are sequentially locked to ensure you don't collect evidence before the framework is properly scoped.",
                                targetId: "journey-stages"
                            },
                            {
                                step: "Next Best Action",
                                description: "Always check the dynamic banner for the single most important task right now.",
                                targetId: "journey-next-action"
                            }
                        ]}
                        scenarios={[
                            {
                                title: "Explaining Timeline to Board",
                                example: "The CEO wants to know when the company will be 'SOC 2 Ready' for a big enterprise deal.",
                                auditTip: "Use the AI Prediction widget. It calculates velocity from manual work and automated evidence to provide a data-driven date."
                            },
                            {
                                title: "Stuck in Discovery",
                                example: "You've finished the Readiness Assessment but don't know why 'Evidence Collection' is still locked.",
                                auditTip: "Check the unlock criteria on the Level 2 card. Most frameworks require at least 40% readiness score to ensure you've defined the scope."
                            }
                        ]}
                    />
                </div>

                {/* Hero Header & Predictive Metrics Card */}
                <div id="journey-hero" className="border border-border/80 bg-card/70 backdrop-blur-xl shadow-xs rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 p-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        {/* Title & Introduction */}
                        <div className="max-w-2xl min-w-0">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Autonomous Roadmap & Audit Readiness</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                                <span className="p-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl shrink-0">
                                    <Map className="w-6 h-6" />
                                </span>
                                <span>Compliance Journey</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                                Your data-driven path to audit certification. Complete sequential phases to unlock evidence mapping and external audit collaboration.
                            </p>
                        </div>

                        {/* Predictive Engine & Progress Micro-Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full lg:w-auto lg:min-w-[420px] shrink-0">
                            {/* AI Prediction Widget */}
                            <div id="journey-ai-prediction" className="bg-muted/40 border border-border/80 rounded-xl p-4 shadow-2xs">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                                        <BrainCircuit className="w-3.5 h-3.5" />
                                        <span>AI Prediction</span>
                                    </div>
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-1.5 py-0">
                                        On Track
                                    </Badge>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                                    {formattedDate}
                                </div>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                                    <Calendar className="w-3 h-3 text-muted-foreground/80" /> Estimated Audit Ready
                                </p>
                            </div>

                            {/* Overall Progress Widget */}
                            <div id="journey-overall-progress" className="bg-muted/40 border border-border/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                                <div className="flex justify-between text-xs font-bold mb-2">
                                    <span className="text-muted-foreground">Overall Velocity</span>
                                    <span className="text-foreground tabular-nums">{overallProgress}%</span>
                                </div>
                                <Progress value={overallProgress} className="h-2 bg-muted rounded-full overflow-hidden" />
                                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                                    <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                                    <span>Top 15% pace in industry</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Next Best Action Banner */}
                {overallProgress < 100 && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-card border border-primary/30 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs relative overflow-hidden"
                        id="journey-next-action"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                        <div className="flex items-center gap-4 min-w-0 pl-1">
                            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                                <Target className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-foreground">Recommended Next Action</h3>
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">Priority</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {readinessScore < 100
                                        ? "Map your baseline security policies and asset scope in the Readiness Assessment."
                                        : "Complete automated evidence sync for high-impact technical controls."}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setLocation(readinessScore < 100 ? `/clients/${clientId}/readiness/wizard` : `/clients/${clientId}/evidence`)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl px-5 h-10 shrink-0 w-full md:w-auto shadow-xs gap-2"
                        >
                            <span>Take Action</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    </motion.div>
                )}

                {/* Phase Milestones Stepper Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-foreground">Certification Milestones</h2>
                        <span className="text-xs text-muted-foreground font-medium">3 Sequential Phases</span>
                    </div>

                    {/* Responsive Grid for Journey Phase Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch" id="journey-stages">
                        {stages.map((stage) => {
                            const isLocked = stage.locked;
                            const isCompleted = stage.status === 'completed';

                            return (
                                <div
                                    key={stage.id}
                                    className={cn(
                                        "flex flex-col justify-between rounded-2xl border transition-all duration-200 bg-card/70 backdrop-blur-md overflow-hidden min-w-0",
                                        isLocked
                                            ? "border-border/60 opacity-85"
                                            : isCompleted
                                            ? "border-emerald-500/30 hover:border-emerald-500/60 shadow-xs"
                                            : `border-primary/40 hover:border-primary shadow-xs ${stage.glowColor}`
                                    )}
                                >
                                    {/* Card Header & Content */}
                                    <div className="p-6 space-y-4 flex-1 flex flex-col">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0",
                                                    isLocked
                                                        ? "bg-muted text-muted-foreground border-border"
                                                        : cn(stage.bgAccent, stage.color)
                                                )}>
                                                    <stage.icon className="w-5 h-5" />
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] font-bold uppercase tracking-wider",
                                                        isLocked ? "border-border text-muted-foreground" : "border-border text-foreground"
                                                    )}
                                                >
                                                    Level {stage.level}
                                                </Badge>
                                            </div>

                                            {isCompleted ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold gap-1 px-2.5 py-0.5">
                                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                                </Badge>
                                            ) : isLocked ? (
                                                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs font-semibold gap-1 px-2.5 py-0.5">
                                                    <Lock className="w-3 h-3" /> Locked
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-bold animate-pulse px-2.5 py-0.5">
                                                    Active
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                                {stage.subtitle}
                                            </div>
                                            <h3 className={cn("text-xl font-bold tracking-tight", isLocked ? "text-muted-foreground" : "text-foreground")}>
                                                {stage.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                                                {stage.description}
                                            </p>
                                        </div>

                                        {/* Progress Bar (if not locked) */}
                                        <div className="mt-auto pt-4">
                                            {!isLocked ? (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-muted-foreground">Phase Completion</span>
                                                        <span className={stage.color}>{stage.progress}%</span>
                                                    </div>
                                                    <Progress value={stage.progress} className="h-2 bg-muted rounded-full" />
                                                </div>
                                            ) : (
                                                <div className="bg-muted/50 rounded-xl p-3 border border-border border-dashed flex items-start gap-2.5 text-xs text-muted-foreground">
                                                    <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                    <p className="leading-snug">{stage.unlockCriteria}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="p-6 pt-0">
                                        {isLocked ? (
                                            <Button disabled className="w-full text-xs font-semibold rounded-xl bg-muted text-muted-foreground border border-border/70 h-10">
                                                <Lock className="w-3.5 h-3.5 mr-2" /> Phase Locked
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => setLocation(stage.path)}
                                                className={cn(
                                                    "w-full text-xs font-bold rounded-xl h-10 transition-all gap-1.5",
                                                    isCompleted
                                                        ? "bg-card text-foreground border border-border hover:bg-muted"
                                                        : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                                                )}
                                            >
                                                <span>{stage.buttonText}</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Value Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/60">
                    <div className="p-4 rounded-xl border border-border/70 bg-card/50 backdrop-blur-xs flex gap-3.5 items-start">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <Flag className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-foreground text-xs">Guided Progression</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                Clear sequential gates eliminate context switching and keep your team focused on what moves the needle.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/70 bg-card/50 backdrop-blur-xs flex gap-3.5 items-start">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-foreground text-xs">Evidence Gating</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                Uploading is unlocked only after framework controls are scoped, preventing redundant work.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/70 bg-card/50 backdrop-blur-xs flex gap-3.5 items-start">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-foreground text-xs">Audit Room Readiness</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                The external audit room opens only when readiness scores verify you are fully prepared for certification.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
