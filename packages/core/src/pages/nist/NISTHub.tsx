import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    Shield,
    Zap,
    BookOpen,
    Activity,
    Users,
    Truck,
    ArrowRight,
    ExternalLink,
    Lock,
    CheckCircle2,
    AlertCircle,
    LayoutGrid,
    Target
} from "lucide-react";
import { Link } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export default function NISTHub() {
    const { selectedClientId } = useClientContext();

    // Fetch CSF Data for the Summary Card
    const { data: assessments } = trpc.maturity.getAssessments.useQuery(
        { clientId: selectedClientId || 0, frameworkId: 'nist-csf-2' },
        { enabled: !!selectedClientId }
    );

    const { data: frameworkData } = trpc.maturity.getFrameworkData.useQuery(
        { frameworkId: 'nist-csf-2' },
        { enabled: !!selectedClientId }
    );

    const csfProgress = useMemo(() => {
        if (!assessments || !frameworkData) return 0;
        const total = frameworkData.requirements.length;
        const achieved = assessments.filter(a => a.isAchieved).length;
        return total > 0 ? Math.round((achieved / total) * 100) : 0;
    }, [assessments, frameworkData]);

    const standards = [
        {
            id: "csf",
            title: "NIST CSF 2.0",
            subtitle: "Cybersecurity Framework",
            description: "The common language for managing cybersecurity risk through 6 core functions.",
            icon: Shield,
            status: "active",
            progress: csfProgress,
            link: `/clients/${selectedClientId}/nist/dashboard`,
            color: "text-blue-600",
            borderColor: "border-blue-200",
            bgColor: "bg-blue-50/50"
        },
        {
            id: "rmf",
            title: "NIST SP 800-37",
            subtitle: "Risk Management Framework",
            description: "A 7-step process for system authorization and continuous monitoring.",
            icon: Activity,
            status: "active",
            progress: 0,
            link: `/clients/${selectedClientId}/nist/rmf`,
            color: "text-emerald-600",
            borderColor: "border-emerald-200",
            bgColor: "bg-emerald-50/50"
        },
        {
            id: "ra",
            title: "NIST SP 800-30",
            subtitle: "Risk Assessment Guide",
            description: "Detailed methodology for identifying and estimating risk likelihood and impact.",
            icon: Target,
            status: "active",
            progress: 0,
            link: `/clients/${selectedClientId}/nist/800-30`,
            color: "text-amber-600",
            borderColor: "border-amber-200",
            bgColor: "bg-amber-50/50"
        },
        {
            id: "org",
            title: "NIST SP 800-39",
            subtitle: "Organizational Risk",
            description: "High-level risk governance aligning business mission with technical security.",
            icon: Users,
            status: "placeholder",
            progress: 0,
            link: "#",
            color: "text-purple-600",
            borderColor: "border-purple-200",
            bgColor: "bg-purple-50/50"
        },
        {
            id: "controls",
            title: "NIST SP 800-53",
            subtitle: "Security & Privacy Controls",
            description: "The definitive catalog of technical controls for data protection.",
            icon: Lock,
            status: "active",
            progress: 0,
            link: `/clients/${selectedClientId}/nist/800-53`,
            color: "text-slate-600",
            borderColor: "border-slate-200",
            bgColor: "bg-slate-50/50"
        },
        {
            id: "scrm",
            title: "NIST SP 800-161",
            subtitle: "Supply Chain Risk",
            description: "Advanced management for third-party, vendor, and library dependencies.",
            icon: Truck,
            status: "placeholder",
            progress: 0,
            link: "#",
            color: "text-rose-600",
            borderColor: "border-rose-200",
            bgColor: "bg-rose-50/50"
        }
    ];

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase tracking-widest text-[10px]">
                            Ecosystem Overview
                        </Badge>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <LayoutGrid className="h-10 w-10 text-primary" />
                        Unified NIST Hub
                    </h1>
                    <p className="text-xl text-slate-500 max-w-3xl font-medium leading-relaxed">
                        Orchestrate your entire compliance strategy across the interconnected suite of NIST Special Publications and Frameworks.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-slate-200 shadow-sm bg-white">
                        <ExternalLink className="mr-2 h-4 w-4" /> NIST Website
                    </Button>
                </div>
            </div>

            {/* Main Standards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {standards.map((standard) => (
                    <Card
                        key={standard.id}
                        className={cn(
                            "relative overflow-hidden transition-all duration-300 group hover:shadow-xl hover:translate-y-[-4px] border border-slate-200",
                            standard.status === 'placeholder' && "opacity-90"
                        )}
                    >
                        {/* Decorative Background Icon */}
                        <div className="absolute -top-6 -right-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500">
                            <standard.icon className="w-32 h-32" />
                        </div>

                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className={cn(
                                    "p-3 rounded-xl",
                                    standard.bgColor
                                )}>
                                    <standard.icon className={cn("h-6 w-6", standard.color)} />
                                </div>
                                {standard.status === 'active' ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200">
                                        Active
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-400 border-slate-200 font-mono text-[10px]">
                                        ROADMAP
                                    </Badge>
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                                    {standard.title}
                                </CardTitle>
                                <CardDescription className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                    {standard.subtitle}
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="pb-6">
                            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                {standard.description}
                            </p>

                            {standard.status === 'active' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                        <span>Readiness Score</span>
                                        <span>{standard.progress}%</span>
                                    </div>
                                    <Progress value={standard.progress} className="h-1.5" />
                                </div>
                            )}

                            {standard.status === 'placeholder' && (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Zap className="h-4 w-4" />
                                    <span className="text-xs font-medium italic">Integration pending configuration...</span>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="pt-0">
                            {standard.status === 'active' ? (
                                <Link href={standard.link} className="w-full">
                                    <Button className="w-full bg-slate-900 hover:bg-primary transition-all duration-300 shadow-md">
                                        Open Standard <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <Button disabled variant="secondary" className="w-full bg-slate-100 text-slate-400">
                                    Unavailable
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Ecosystem Connectivity Tip */}
            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-primary rounded-full shadow-lg shadow-primary/20">
                    <Shield className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">Ecosystem Insight</h3>
                    <p className="text-slate-600 max-w-4xl text-sm leading-relaxed">
                        NIST Special Publications are designed to be used in tandem. While the **CSF** provides the high-level roadmap,
                        implementing **800-37 (RMF)** operationalizes those goals, and **800-53** provides the technical controls.
                        As you progress in your CSF assessment, relevant technical mappings will automatically suggest improvements across the ecosystem.
                    </p>
                </div>
            </div>
        </div>
    );
}
