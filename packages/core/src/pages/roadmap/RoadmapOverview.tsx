import React, { useState } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    Target,
    Calendar,
    Rocket,
    BarChart3,
    Shield,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    BookOpen,
    Layers,
    Sparkles,
    AlertTriangle,
    FileText,
    Clock,
    Compass,
    TrendingUp,
    Workflow,
    Lock,
    Building2,
    Check
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageGuide } from "@/components/PageGuide";

interface StageDetail {
    number: string;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    badge: string;
    description: string;
    actionableSteps: string[];
    keyDeliverables: string[];
    frameworkAlignment: string;
}

const EXECUTION_STAGES: StageDetail[] = [
    {
        number: "01",
        title: "Define Strategy & Governance",
        subtitle: "Vision, Framework Scoping & Executive Alignment",
        icon: Target,
        badge: "Strategic Horizon",
        description: "Establish the overarching compliance mandate, target regulatory frameworks (ISO 27001, SOC 2, HIPAA, CMMC), and formalize leadership commitment before allocating engineering resources.",
        actionableSteps: [
            "Clarify business drivers (enterprise sales, regulatory mandates, vendor requirements)",
            "Determine certification boundary and cloud/on-prem asset scope",
            "Establish executive steering committee and cross-functional RACI ownership",
            "Select pre-configured framework templates or define bespoke strategic horizons"
        ],
        keyDeliverables: [
            "Approved Information Security Charter",
            "Initial Gap Analysis & Scope Boundary Statement",
            "Target Certification Horizon (e.g. Q2 2026 Audit Window)"
        ],
        frameworkAlignment: "Maps to ISO 27001 Clause 4-5 (Context & Leadership) and SOC 2 CC1 (Control Environment)."
    },
    {
        number: "02",
        title: "Plan Initiatives & Milestones",
        subtitle: "Deconstruct Objectives into Workstreams & KPIs",
        icon: Calendar,
        badge: "Quarterly Roadmapping",
        description: "Break complex audit requirements into discrete, scheduled initiatives. Map critical-path dependencies so policy foundations precede technical controls, preventing rework.",
        actionableSteps: [
            "Decompose high-level mandates into granular workstreams (Policy, Tech Controls, People)",
            "Map inter-initiative dependencies using visual Gantt sequencing",
            "Assign milestone deadlines across Q1 through Q4 execution horizons",
            "Define objective KPI targets (e.g., 100% Control Implementation, 90% Risk Treatment)"
        ],
        keyDeliverables: [
            "Workstream Initiative Breakdown with Assigned Owners",
            "Critical Path Dependency Graph & Timeline",
            "Key Performance Indicator (KPI) Target Baseline"
        ],
        frameworkAlignment: "Maps to ISO 27001 Clause 6 (Planning) and NIST CSF ID.GV (Governance)."
    },
    {
        number: "03",
        title: "Execute, Triage & Track",
        subtitle: "Active Execution Boards & Blocker Escalation",
        icon: Rocket,
        badge: "Continuous Operations",
        description: "Run sprint-by-sprint execution via interactive Kanban and Gantt boards. Automate attention-required lanes to spotlight blocked tasks before they jeopardize audit deadlines.",
        actionableSteps: [
            "Work through active tasks organized by urgency and implementation domain",
            "Triage the 'Attention Required' lane during weekly compliance standups",
            "Attach objective evidence, configurations, and policies directly to roadmap cards",
            "Perform sprint retrospectives to rebalance bandwidth and milestone target dates"
        ],
        keyDeliverables: [
            "Live Strategic Kanban with real-time lane telemetry",
            "Audit Trail of Completed Initiatives and Linked Artifacts",
            "Blocker & Impediment Resolution Log"
        ],
        frameworkAlignment: "Maps to ISO 27001 Clause 8 (Operation) and SOC 2 CC5-CC7 (Risk Mitigation & Ops)."
    },
    {
        number: "04",
        title: "Measure Impact & Governance",
        subtitle: "Audit Readiness Attestation & Board Reporting",
        icon: BarChart3,
        badge: "Assurance & Evolution",
        description: "Close the feedback loop by benchmarking implemented controls against initial gap scores. Generate executive-ready summary reports for the Board, investors, and accredited auditors.",
        actionableSteps: [
            "Quantify progress across target KPI metrics versus initial baselines",
            "Trigger automated PDF/CSV report generation from the Command Center",
            "Present program maturity to C-suite and external certification bodies",
            "Roll completed initiatives into continuous monitoring and renewal cycles"
        ],
        keyDeliverables: [
            "Executive Strategic Roadmap Report & Maturity Assessment",
            "Pre-Audit Readiness Scorecard for External Certifiers",
            "Continuous Compliance & Renewal Plan"
        ],
        frameworkAlignment: "Maps to ISO 27001 Clause 9-10 (Evaluation & Improvement) and SOC 2 CC9 (Monitoring)."
    }
];

const METHODOLOGY_PILLARS = [
    {
        title: "Evidence-Backed Milestones",
        description: "A roadmap milestone is never considered done based on subjective checkmarks. Every initiative requires linked policies, automated tests, or verifiable compliance artifacts.",
        icon: Shield
    },
    {
        title: "Dependency-Aware Critical Paths",
        description: "Avoid stalled rollouts by sequencing prerequisites properly. Foundational risk assessments and access controls precede complex technical implementations.",
        icon: Workflow
    },
    {
        title: "Proactive Attention Triage",
        description: "Automated heuristics detect delayed initiatives and critical control dependencies, surfacing them instantly in the Attention Required lane before audit schedules slip.",
        icon: AlertTriangle
    },
    {
        title: "Executive-to-Engineer Alignment",
        description: "Translate high-level board commitments directly into actionable engineering tasks, maintaining end-to-end visibility from strategic vision to individual control execution.",
        icon: TrendingUp
    }
];

const TEMPLATE_PREVIEWS = [
    {
        id: "iso27001",
        name: "ISO 27001:2022 Certification",
        framework: "ISO 27001",
        horizon: "4 Quarters",
        icon: Shield,
        description: "End-to-end ISMS implementation across 93 Annex A controls and mandatory management clauses."
    },
    {
        id: "soc2",
        name: "SOC 2 Type II Readiness",
        framework: "SOC 2",
        horizon: "2-3 Quarters",
        icon: Lock,
        description: "Structured 6-month observation window covering Security, Availability, and Confidentiality."
    },
    {
        id: "hipaa",
        name: "HIPAA Security & Privacy Foundation",
        framework: "HIPAA",
        horizon: "2 Quarters",
        icon: FileText,
        description: "Safeguards for Protected Health Information (PHI) across administrative, physical, and technical domains."
    },
    {
        id: "cmmc",
        name: "CMMC 2.0 Level 2 Preparation",
        framework: "CMMC 2.0",
        horizon: "4 Quarters",
        icon: Building2,
        description: "Defense contractor readiness focusing on 110 NIST SP 800-171 security requirements for CUI."
    }
];

export default function RoadmapOverview() {
    const params = useParams();
    const clientId = params.id ? parseInt(params.id, 10) : 0;
    const [, setLocation] = useLocation();
    const [selectedStage, setSelectedStage] = useState<number>(0);

    const activeStage = EXECUTION_STAGES[selectedStage];

    return (
        <DashboardLayout>
            <div className="space-y-10 pb-20 px-6 max-w-[1600px] mx-auto">
                {/* Navigation & Guide */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Roadmaps", href: `/clients/${clientId}/roadmap` },
                            { label: "Methodology & Framework" },
                        ]}
                    />
                    <PageGuide
                        title="Roadmap Methodology Guide"
                        description="Comprehensive framework for transforming compliance mandates into structured, milestone-driven execution."
                        rationale="Security programs fail when isolated from delivery pipelines. This 4-stage framework guarantees audit readiness through continuous milestone tracking and verifiable evidence linkage."
                        howToUse={[
                            { step: "Review Stages", description: "Follow the 4 execution phases from strategy definition to impact measurement." },
                            { step: "Pick Blueprint", description: "Use pre-built templates for ISO 27001, SOC 2, HIPAA, or CMMC." },
                            { step: "Track Execution", description: "Navigate to the Command Center to triage active lanes and monitor milestones." }
                        ]}
                        integrations={[
                            { name: "Framework Templates", description: "Pre-populated milestone blueprints." },
                            { name: "Executive Reports", description: "Automated board and audit reporting." },
                            { name: "Control Crosswalks", description: "Bidirectional linkage to technical evidence." }
                        ]}
                    />
                </div>

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl border border-slate-700/50">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                    <div className="relative z-10 p-8 md:p-12 space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 text-xs font-semibold">
                                <Compass className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                                Strategic Execution Framework
                            </Badge>
                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 text-xs font-semibold">
                                4-Stage Methodology
                            </Badge>
                        </div>

                        <div className="max-w-3xl space-y-4">
                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                                Strategic Roadmap Command Center
                            </h1>
                            <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                                Turn compliance frameworks and certification deadlines into predictable, quarterly execution. 
                                The ComplianceOS Roadmap Methodology establishes clear milestone ownership, manages critical-path dependencies, 
                                and ties evidence directly to audit objectives.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2">
                            <Button
                                onClick={() => setLocation(`/clients/${clientId}/roadmap`)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/25 h-11 px-6"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Go to Command Center
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setLocation(`/clients/${clientId}/roadmap/templates`)}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-semibold h-11 px-6"
                            >
                                <Sparkles className="w-4 h-4 mr-2 text-blue-300" />
                                Explore Roadmap Templates
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setLocation(`/clients/${clientId}/roadmap/create`)}
                                className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 font-medium h-11 px-6"
                            >
                                Create Custom Roadmap
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Interactive 4-Stage Execution Framework Breakdown */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-3">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Step-by-Step Architecture
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                The 4 Execution Framework Stages
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500 max-w-md">
                            Select any stage to inspect its operational protocols, actionable steps, and required audit artifacts.
                        </p>
                    </div>

                    {/* Stage Selector Tabs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {EXECUTION_STAGES.map((stage, idx) => {
                            const Icon = stage.icon;
                            const isSelected = selectedStage === idx;
                            return (
                                <button
                                    key={stage.number}
                                    type="button"
                                    onClick={() => setSelectedStage(idx)}
                                    className={`relative text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                                        isSelected
                                            ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]"
                                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                            isSelected ? "bg-emerald-500 text-slate-950 font-extrabold" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                        }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={`text-xs font-mono font-semibold ${isSelected ? "text-emerald-400" : "text-slate-400"}`}>
                                            STAGE {stage.number}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-base line-clamp-1">{stage.title}</h3>
                                    <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                                        {stage.subtitle}
                                    </p>
                                    {isSelected && (
                                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-500 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Stage Detailed Panel */}
                    <Card className="border-slate-200 dark:border-slate-700 shadow-lg bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-700/50 p-6 md:p-8">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                                            Stage {activeStage.number} Deep Dive
                                        </Badge>
                                        <Badge variant="secondary" className="font-normal text-xs">
                                            {activeStage.badge}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                                        {activeStage.title}
                                    </CardTitle>
                                    <CardDescription className="text-base text-slate-600 dark:text-slate-300 mt-2 max-w-4xl">
                                        {activeStage.description}
                                    </CardDescription>
                                </div>
                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs max-w-xs">
                                    <p className="font-semibold mb-1 flex items-center">
                                        <Shield className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                        Framework Mapping
                                    </p>
                                    <p className="text-[11px] leading-relaxed">
                                        {activeStage.frameworkAlignment}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Actionable Steps */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center">
                                    <Workflow className="w-4 h-4 mr-2 text-blue-600" />
                                    Operational Workflow
                                </h4>
                                <div className="space-y-3">
                                    {activeStage.actionableSteps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
                                                {step}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Required Deliverables */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center">
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                                    Required Audit Deliverables
                                </h4>
                                <div className="space-y-3">
                                    {activeStage.keyDeliverables.map((deliverable, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                <Check className="w-3 h-3 stroke-[3]" />
                                            </div>
                                            <p className="text-sm font-medium text-emerald-950 dark:text-emerald-100 leading-snug">
                                                {deliverable}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Core Methodology Pillars */}
                <div className="space-y-6 pt-4">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Guiding Principles
                        </span>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">
                            Why ComplianceOS Roadmaps Succeed
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                            Traditional roadmaps gather dust because they are disconnected from technical realities. 
                            Our methodology grounds high-level goals in four operational safeguards:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {METHODOLOGY_PILLARS.map((pillar, idx) => {
                            const Icon = pillar.icon;
                            return (
                                <Card key={idx} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                            {pillar.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                            {pillar.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Pre-Built Framework Blueprints */}
                <div className="space-y-6 pt-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Pre-Configured Templates
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                Accelerated Framework Templates
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Jumpstart your roadmap with expert-crafted milestones, control mappings, and KPI baselines.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setLocation(`/clients/${clientId}/roadmap/templates`)}
                            className="font-medium text-xs whitespace-nowrap"
                        >
                            View All Templates
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {TEMPLATE_PREVIEWS.map((tmpl) => {
                            const Icon = tmpl.icon;
                            return (
                                <Card key={tmpl.id} className="group border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <Badge variant="secondary" className="text-[10px]">
                                                {tmpl.horizon}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                            {tmpl.name}
                                        </CardTitle>
                                        <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                                            {tmpl.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setLocation(`/clients/${clientId}/roadmap/templates`)}
                                            className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 p-0 h-8 justify-start"
                                        >
                                            Inspect Template Plan <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Call to Action */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            Ready to orchestrate your strategic compliance roadmap?
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                            Select a roadmap template or open your live Command Center to begin aligning cross-functional teams with audit goals.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <Button
                            onClick={() => setLocation(`/clients/${clientId}/roadmap`)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 px-5"
                        >
                            Open Roadmap Board
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setLocation(`/clients/${clientId}/roadmap/templates`)}
                            className="font-semibold px-5"
                        >
                            Select Template
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
