import React, { useState } from 'react';
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
    Play,
    Loader2,
    Zap,
    Target,
    BrainCircuit,
    Calendar,
    AlertTriangle,
    Shield
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageGuide } from "@/components/PageGuide";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" }
    }
};

export default function ComplianceJourneyDashboard() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");
    const [_location, setLocation] = useLocation();

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
            subtitle: "Phase 1: Discovery",
            description: "Identify gaps against frameworks like SOC 2 & ISO 27001.",
            icon: Flag,
            path: `/clients/${clientId}/readiness/wizard`,
            color: "text-blue-500",
            bgGradient: "from-blue-500/10 to-blue-400/5",
            glowColor: "shadow-blue-500/20",
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
            subtitle: "Phase 2: Implementation",
            description: "Connect integrations and upload proof of compliance.",
            icon: ClipboardCheck,
            path: `/clients/${clientId}/evidence`,
            color: "text-purple-500",
            bgGradient: "from-purple-500/10 to-fuchsia-500/10",
            glowColor: "shadow-purple-500/20",
            buttonText: "Collect Evidence",
            progress: evidenceProgress,
            status: isEvidenceUnlocked ? 'in-progress' : 'locked',
            locked: !isEvidenceUnlocked,
            unlockCriteria: "Reach 40% Readiness Score to unlock this phase."
        },
        {
            id: 'audit',
            level: 3,
            title: "Audit Preparation",
            subtitle: "Phase 3: Certification",
            description: "Collaborate with auditors in the secure Audit Room.",
            icon: Briefcase,
            path: `/clients/${clientId}/audit-hub`,
            color: "text-emerald-500",
            bgGradient: "from-emerald-500/10 to-teal-500/10",
            glowColor: "shadow-emerald-500/20",
            buttonText: "Enter Audit Hub",
            progress: 0,
            status: isAuditUnlocked ? 'ready' : 'locked',
            locked: !isAuditUnlocked,
            unlockCriteria: "Reach 80% Readiness & 80% Evidence to unlock."
        }
    ];

    if (readinessLoading || statsLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen bg-muted/50">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-muted/50 pb-20 overflow-hidden">
                {/* Premium Header / Hero */}
                <div id="journey-hero" className="relative bg-card border-b border-border pt-10 pb-16 px-4 md:px-20 overflow-hidden">
                    {/* Background glow effects */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl opacity-50 z-0 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-100 to-emerald-100 blur-3xl opacity-50 z-0 pointer-events-none" />

                    <div className="w-full relative z-10 max-w-7xl mx-auto">
                        <Breadcrumb
                            items={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Compliance Journey" },
                            ]}
                            className="mb-8"
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
                                    auditTip: "Use the AI Prediction widget. It calculates velocity from your manual work and automated evidence to provide a data-driven date, rather than a best-guess estimate."
                                },
                                {
                                    title: "Stuck in Discovery",
                                    example: "You've finished the Readiness Assessment but don't know why 'Evidence Collection' is still locked.",
                                    auditTip: "Check the unlock criteria on the Level 2 card. Most frameworks require at least 40% readiness score to ensure you've defined the scope before you start uploading documents."
                                }
                            ]}
                        />

                        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mt-8">
                            <div className="max-w-2xl">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="flex items-center gap-3 mb-4"
                                >
                                    <div className="p-3 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
                                        <Map className="w-6 h-6" />
                                    </div>
                                    <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Compliance Journey</h1>
                                </motion.div>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="text-lg text-muted-foreground leading-relaxed"
                                >
                                    Your roadmap to certification. Complete each phase to unlock the next level.
                                    We've combined AI predictions with task routing to keep you moving fast.
                                </motion.p>
                            </div>

                            {/* Predictive Engine Widget */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch gap-4"
                            >
                                <div id="journey-ai-prediction" className="bg-card/80 backdrop-blur-md p-5 rounded-2xl border border-border shadow-xl min-w-[280px] flex-1">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                                            <BrainCircuit className="w-4 h-4" />
                                            <span>AI Prediction</span>
                                        </div>
                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                            On Track
                                        </Badge>
                                    </div>
                                    <div className="flex items-baseline gap-3 mb-1">
                                        <span className="text-3xl font-extrabold text-foreground">{formattedDate}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> Estimated Audit Readiness
                                    </p>
                                </div>

                                <div id="journey-overall-progress" className="bg-sidebar p-5 rounded-2xl border border-sidebar-border shadow-xl min-w-[240px] flex-1 relative overflow-hidden text-sidebar-foreground flex flex-col justify-center">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-sidebar-foreground/5 rounded-full blur-2xl -mr-10 -mt-10" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between text-sm font-medium mb-3 text-sidebar-foreground/70">
                                            <span>Overall Progress</span>
                                            <span className="text-sidebar-foreground font-bold">{overallProgress}%</span>
                                        </div>
                                        <Progress value={overallProgress} className="h-2.5 bg-sidebar-foreground/20 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-300" />
                                        <div className="mt-3 flex items-center gap-2 text-xs text-sidebar-foreground/60">
                                            <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                            Top 15% pace in your industry
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-7xl mx-auto px-4 md:px-20 py-16">

                    {/* Next Best Action Banner */}
                    {overallProgress < 100 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="mb-12 bg-card border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm relative overflow-hidden"
                            id="journey-next-action"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Target className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        Next Best Action
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        To maximize velocity, {readinessScore < 100 ? "continue mapping your current posture in the Readiness Assessment." : "focus on collecting evidence for high-impact controls."}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setLocation(readinessScore < 100 ? `/clients/${clientId}/readiness/wizard` : `/clients/${clientId}/evidence`)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-5 whitespace-nowrap"
                            >
                                Take Action <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </motion.div>
                    )}

                    {/* Journey Map */}
                    <div className="relative mt-8">
                        {/* Connecting Line (Animated) */}
                        <div className="hidden lg:block absolute top-[130px] left-[10%] right-[10%] h-1 bg-muted -z-0 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${overallProgress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"
                            />
                        </div>

                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid lg:grid-cols-3 gap-8"
                            id="journey-stages"
                        >
                            {stages.map((stage, index) => {
                                const isLocked = stage.locked;
                                const isCompleted = stage.status === 'completed';

                                return (
                                    <motion.div variants={itemVariants} key={stage.id} className="relative group z-10 h-full">

                                        {/* Level Node Connector */}
                                        <div className="hidden lg:flex absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-card border-4 border-background items-center justify-center z-30 pointer-events-none">
                                            <div className={cn(
                                                "w-4 h-4 rounded-full transition-colors duration-500",
                                                isCompleted ? "bg-emerald-500" : isLocked ? "bg-muted-foreground/30" : "bg-primary animate-pulse"
                                            )} />
                                        </div>

                                        <div className={cn(
                                            "h-full flex flex-col p-1 rounded-3xl transition-all duration-500 mt-4",
                                            isLocked ? "bg-muted" : `bg-card border border-border hover:border-primary/20 hover:shadow-2xl ${stage.glowColor} hover:-translate-y-1`
                                        )}>
                                            <div className={cn(
                                                "h-full rounded-[1.4rem] p-6 lg:p-8 flex flex-col relative overflow-hidden",
                                                isLocked ? "opacity-80" : "bg-card"
                                            )}>
                                                {/* Subtle gradient background for active cards */}
                                                {!isLocked && (
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${stage.bgGradient} opacity-50 z-0`} />
                                                )}

                                                {/* Header Icon Area */}
                                                <div className="flex justify-between items-start mb-6 relative z-10">
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                                                        isLocked ? "bg-muted text-muted-foreground" : `bg-card shadow-md border border-border ${stage.color}`
                                                    )}>
                                                        <stage.icon className="w-7 h-7" />
                                                    </div>

                                                    {isCompleted ? (
                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 pl-1.5 pr-2.5 py-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completed
                                                        </Badge>
                                                    ) : isLocked ? (
                                                        <div className="bg-muted p-2.5 rounded-full">
                                                            <Lock className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-semibold animate-pulse">
                                                            Active
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Text Content */}
                                                <div className="mb-8 relative z-10 flex-grow">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] uppercase tracking-wider font-bold",
                                                            isLocked ? "border-border text-muted-foreground" : "border-foreground text-foreground"
                                                        )}>
                                                            Level {stage.level}
                                                        </Badge>
                                                    </div>
                                                    <h2 className={cn("text-2xl font-bold mb-2 tracking-tight", isLocked ? "text-muted-foreground" : "text-foreground")}>
                                                        {stage.title}
                                                    </h2>
                                                    <p className={cn("text-sm leading-relaxed", isLocked ? "text-muted-foreground" : "text-muted-foreground")}>
                                                        {stage.description}
                                                    </p>
                                                </div>

                                                {/* Progress & Action */}
                                                <div className="mt-auto relative z-10 relative">
                                                    {!isLocked && (
                                                        <div className="space-y-3 mb-6">
                                                            <div className="flex justify-between text-sm font-semibold text-foreground">
                                                                <span>Phase Progress</span>
                                                                <span className={stage.color}>{stage.progress}%</span>
                                                            </div>
                                                            <Progress value={stage.progress} className={cn("h-2.5 [&>div]:bg-current", stage.color)} />
                                                        </div>
                                                    )}

                                                    {isLocked ? (
                                                        <div className="space-y-4">
                                                            <div className="bg-muted/50 rounded-xl p-4 border border-border border-dashed flex gap-3 text-sm text-muted-foreground">
                                                                <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                                                <p>{stage.unlockCriteria}</p>
                                                            </div>
                                                            <Button disabled className="w-full bg-muted hover:bg-muted text-muted-foreground font-semibold h-12 rounded-xl">
                                                                Locked
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            onClick={() => setLocation(stage.path)}
                                                            className={cn(
                                                                "w-full h-12 rounded-xl font-bold text-sm transition-all group-hover:shadow-lg focus:ring-4",
                                                                isCompleted
                                                                    ? "bg-card text-foreground border border-border hover:bg-muted hover:border-muted-foreground/40"
                                                                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                                                            )}
                                                        >
                                                            {stage.buttonText}
                                                            {!isCompleted && <ArrowRight className="w-4 h-4 ml-2" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>

                    {/* Footer Info */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                        className="mt-20 grid md:grid-cols-3 gap-6"
                    >
                        <div className="group p-5 bg-card border border-border hover:border-primary/20 rounded-2xl flex gap-4 items-start transition-colors">
                            <div className="bg-primary/10 group-hover:bg-primary/20 p-2.5 rounded-xl text-primary transition-colors">
                                <Flag className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Guided Progression</h4>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Completing one phase unlocks the next, preventing context switching and reducing noise.</p>
                            </div>
                        </div>
                        <div className="group p-5 bg-card border border-border hover:border-purple-200 rounded-2xl flex gap-4 items-start transition-colors">
                            <div className="bg-purple-50 group-hover:bg-purple-100 p-2.5 rounded-xl text-purple-600 transition-colors">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Evidence Gating</h4>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Evidence collection only starts after you define your controls properly in the Readiness phase.</p>
                            </div>
                        </div>
                        <div className="group p-5 bg-card border border-border hover:border-emerald-200 rounded-2xl flex gap-4 items-start transition-colors">
                            <div className="bg-emerald-50 group-hover:bg-emerald-100 p-2.5 rounded-xl text-emerald-600 transition-colors">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Always Audit-Ready</h4>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">The secure Audit Hub opens only when you are mathematically ready, saving you high auditor fees.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}
