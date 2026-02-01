import React, { useState } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    Flag,
    ClipboardCheck,
    Briefcase, // For Audit
    ArrowRight,
    Lock,
    Unlock,
    CheckCircle2,
    ShieldCheck,
    AlertCircle
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { cn } from "@/lib/utils";

export default function ComplianceJourneyDashboard() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");
    const [_location, setLocation] = useLocation();

    // Mock Data for Progressive Disclosure (Phase 1 Shell)
    const [readinessScore, _setReadinessScore] = useState(100); // Mock score (Unlocked)
    const [evidenceProgress, setEvidenceProgress] = useState(100); // Mock progress (Unlocked)
    const auditReady = false;

    // Determine Stage Status
    const isEvidenceUnlocked = readinessScore >= 40; // Example threshold
    const isAuditUnlocked = readinessScore >= 80 && evidenceProgress >= 80;

    const stages = [
        {
            id: 'readiness',
            title: "Readiness Assessment",
            description: "Assess your current security posture against frameworks like SOC 2 or ISO 27001.",
            icon: Flag,
            path: `/clients/${clientId}/readiness/wizard`,
            color: "text-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            borderColor: "border-blue-200 dark:border-blue-800",
            buttonText: "Start Assessment",
            progress: readinessScore,
            status: readinessScore >= 80 ? 'completed' : 'in-progress',
            locked: false
        },
        {
            id: 'evidence',
            title: "Evidence Collection",
            description: "Collect and organize evidence to prove your controls are operating effectively.",
            icon: ClipboardCheck,
            path: `/clients/${clientId}/evidence`,
            color: "text-purple-500",
            bgColor: "bg-purple-50 dark:bg-purple-900/20",
            borderColor: "border-purple-200 dark:border-purple-800",
            buttonText: "Collect Evidence",
            progress: evidenceProgress,
            status: isEvidenceUnlocked ? 'in-progress' : 'locked',
            locked: !isEvidenceUnlocked
        },
        {
            id: 'audit',
            title: "Audit Preparation",
            description: "Collaborate with auditors, manage request lists (PBC), and finalize your audit.",
            icon: Briefcase,
            path: `/clients/${clientId}/audit-hub`,
            color: "text-emerald-500",
            bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
            borderColor: "border-emerald-200 dark:border-emerald-800",
            buttonText: "Enter Audit Hub",
            progress: 0,
            status: isAuditUnlocked ? 'ready' : 'locked',
            locked: !isAuditUnlocked
        }
    ];

    // Calculate Overall Journey Progress
    const overallProgress = Math.round((readinessScore + evidenceProgress + (auditReady ? 100 : 0)) / 3);

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-20 px-6 max-w-7xl mx-auto py-8">
                <Breadcrumb
                    items={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Compliance Journey" },
                    ]}
                />

                {/* Header Section */}
                <div className="space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight">Your Compliance Journey</h1>
                    <p className="text-lg text-muted-foreground max-w-3xl">
                        Follow this step-by-step path to achieve and maintain compliance.
                        Start with assessing your gaps, then move to collecting evidence, and finally prepare for your audit.
                    </p>
                </div>

                {/* Overall Progress */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Overall Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Progress value={overallProgress} className="h-4 flex-1" />
                            <span className="font-bold text-lg min-w-[3rem] text-right">{overallProgress}%</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Stages Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {stages.map((stage, index) => (
                        <div key={stage.id} className="relative group">
                            {/* Connector Line (Desktop) */}
                            {index < stages.length - 1 && (
                                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-200 z-0 transform -translate-y-1/2" />
                            )}

                            <Card className={cn(
                                "h-full flex flex-col transition-all duration-300 relative z-10",
                                stage.locked ? "opacity-70 grayscale" : "hover:shadow-lg border-opacity-100",
                                stage.locked && "border-dashed"
                            )}>
                                <CardHeader className={cn("border-b", stage.bgColor)}>
                                    <div className="flex justify-between items-start">
                                        <div className={cn("p-3 rounded-xl bg-white shadow-sm", stage.color)}>
                                            <stage.icon className="w-6 h-6" />
                                        </div>
                                        {stage.locked ? (
                                            <Lock className="w-5 h-5 text-gray-400" />
                                        ) : stage.status === 'completed' ? (
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        ) : (
                                            <div className="px-2 py-1 rounded-full bg-white/50 text-xs font-semibold backdrop-blur-sm">
                                                Step {index + 1}
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="mt-4">{stage.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col pt-6 gap-4">
                                    <p className="text-muted-foreground text-sm flex-1">
                                        {stage.description}
                                    </p>

                                    {!stage.locked && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                                <span>Progress</span>
                                                <span>{stage.progress}%</span>
                                            </div>
                                            <Progress value={stage.progress} className="h-2" />
                                        </div>
                                    )}

                                    {stage.locked ? (
                                        <div className="mt-auto p-3 bg-gray-100 rounded-lg text-xs text-gray-600 flex items-center gap-2">
                                            <Lock className="w-3 h-3" />
                                            <span>Complete previous step to unlock</span>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => setLocation(stage.path)}
                                            className="w-full mt-auto group-hover:bg-primary/90"
                                        >
                                            {stage.buttonText}
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>

                {/* Info / Help Section */}
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
                        <CardContent className="p-6 flex items-start gap-4">
                            <ShieldCheck className="w-8 h-8 text-indigo-600 mt-1" />
                            <div>
                                <h3 className="font-bold text-indigo-900 mb-2">Why this approach?</h3>
                                <p className="text-indigo-800/80 text-sm leading-relaxed">
                                    Traditional compliance is chaotic. We've structured the journey into three distinct phases to keep you focused.
                                    Don't worry about the audit until your evidence is ready. Don't collect evidence until you know what you need.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
                        <CardContent className="p-6 flex items-start gap-4">
                            <AlertCircle className="w-8 h-8 text-amber-600 mt-1" />
                            <div>
                                <h3 className="font-bold text-amber-900 mb-2">Need Guidance?</h3>
                                <p className="text-amber-800/80 text-sm leading-relaxed">
                                    Our "Compliance Journey" is designed to be self-paced, but expert help is always available.
                                    Use the "Advisor" chat or book a session if you get stuck on any step.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* DEV TOOLS (Temporary for Testing) */}
                <div className="mt-12 p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Construction Zone: Test Logic</h3>
                    <div className="flex gap-8">
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span>Readiness Score (Unlock Evidence @ 40%)</span>
                                <span className="font-bold">{readinessScore}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={readinessScore}
                                onChange={(e) => _setReadinessScore(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span>Evidence Progress (Unlock Audit @ 80%)</span>
                                <span className="font-bold">{evidenceProgress}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={evidenceProgress}
                                onChange={(e) => setEvidenceProgress(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                        * Move the slider to &gt; 80% to see the "Audit Preparation" card unlock.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
