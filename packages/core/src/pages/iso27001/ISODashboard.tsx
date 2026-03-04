import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { Badge } from "@complianceos/ui/ui/badge";
import { useLocation, useParams } from "wouter";
import {
    Shield,
    FileText,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    TrendingUp,
    Calendar,
    Users,
    Key,
    Lock,
    BookOpen
} from "lucide-react";

import { ISOLayout } from "./ISOLayout";
import { PageGuide } from "@/components/PageGuide";

export default function ISODashboard() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");
    const [, setLocation] = useLocation();

    const modules = [
        {
            title: "Program Guide",
            description: "Step-by-step ISO 27001 implementation guide.",
            icon: BookOpen,
            path: `/clients/${clientId}/iso27001/program-guide`,
            progress: 0,
            status: "Start"
        },
        {
            title: "Statement of Applicability",
            description: "Define your ISMS scope and Annex A control usage.",
            icon: CheckCircle2,
            path: `/clients/${clientId}/iso27001/soa`,
            progress: 78,
            status: "In Progress"
        },
        {
            title: "Risk Management",
            description: "ISO 27005 aligned risk assessment and treatment.",
            icon: Shield,
            path: `/clients/${clientId}/iso27001/risks`,
            progress: 45,
            status: "Needs Review"
        },
        {
            title: "Asset Register",
            description: "Classify and manage information assets and owners.",
            icon: Lock,
            path: `/clients/${clientId}/iso27001/assets`,
            progress: 92,
            status: "Active"
        },
        {
            title: "Internal Audit",
            description: "Plan and track ISO internal audit cycles.",
            icon: FileText,
            path: `/clients/${clientId}/audit-manager`,
            progress: 10,
            status: "Scheduled"
        }
    ];

    return (
        <ISOLayout clientId={clientId} fullWidth={true}>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <Shield className="w-8 h-8 text-indigo-600" />
                            ISO 27001 ISMS
                            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none px-3 py-1 text-[10px] font-bold tracking-widest shadow-lg shadow-indigo-200 uppercase">
                                Framework
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Manage your Information Security Management System across the full Annex A control set.
                        </p>
                    </div>
                    <PageGuide
                        title="ISO 27001:2022 ISMS"
                        description="Manage your Information Security Management System across the full Annex A control set."
                        rationale="ISO 27001 certification demonstrates a systematic approach to managing sensitive information. Regular audits against this standard build trust with customers, partners, and regulators."
                        howToUse={[
                            {
                                step: "Statement of Applicability",
                                description: "Start by defining which Annex A controls apply to your ISMS scope.",
                                targetId: "iso-statement-of-applicability-card"
                            },
                            {
                                step: "Risk Management",
                                description: "Identify and treat information security risks aligned to ISO 27005.",
                                targetId: "iso-risk-management-card"
                            },
                            {
                                step: "Asset Register",
                                description: "Classify all information assets and assign owners to ensure accountability.",
                                targetId: "iso-asset-register-card"
                            },
                            {
                                step: "Internal Audit",
                                description: "Schedule and conduct periodic internal audits to verify control effectiveness.",
                                targetId: "iso-internal-audit-card"
                            }
                        ]}
                        scenarios={[
                            {
                                title: "Stage 2 Audit Preparation",
                                example: "Your certification body is arriving next month. Use the 'Compliance Timeline' to verify evidence collection for all in-scope Annex A controls.",
                                auditTip: "Auditors sample your Statement of Applicability to check that justifications for excluded controls are documented and defensible."
                            },
                            {
                                title: "Annual Management Review",
                                example: "ISMS requires an annual Management Review. Export the readiness score and risk treatment status to present to your leadership team.",
                                auditTip: "ISO 27001 Clause 9.3 mandates management review. Document meeting minutes, attendees, and decisions as mandatory audit evidence."
                            }
                        ]}
                        integrations={[
                            { name: "Risk Management", description: "ISO 27005 risk treatments sync with the central risk register." },
                            { name: "Internal Audit", description: "Audit findings automatically generate corrective action items." }
                        ]}
                    />
                </div>

                {/* Program Overview Callout */}
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 mb-6 mt-6">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex gap-4 items-center">
                            <div className="p-3 bg-indigo-100 rounded-xl hidden sm:block">
                                <BookOpen className="w-8 h-8 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 text-lg">ISO 27001 Program Guide</h3>
                                <p className="text-indigo-700/80 max-w-2xl">
                                    Step-by-step ISO 27001 implementation guide to help you build your ISMS framework.
                                </p>
                            </div>
                        </div>
                        <Button onClick={() => setLocation(`/clients/${clientId}/iso27001/program-guide`)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold whitespace-nowrap">
                            View Guide <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Workflow Introduction Section */}
                <Card id="iso-program-workflow" className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-lg overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-indigo-400" />
                            Implementation Workflow
                        </CardTitle>
                        <CardDescription className="text-slate-300">
                            Follow this linear workflow to establish your compliance baseline.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                            {/* Connector Line (Desktop) */}
                            <div className="hidden md:block absolute top-6 left-10 right-10 h-0.5 bg-slate-700 -z-10"></div>

                            {modules.filter(m => m.title !== "Program Guide").map((item, i) => {
                                let bg = "bg-blue-900/50";
                                let color = "text-blue-400";
                                if (i === 1) { bg = "bg-emerald-900/50"; color = "text-emerald-400"; }
                                if (i === 2) { bg = "bg-orange-900/50"; color = "text-orange-400"; }
                                if (i === 3) { bg = "bg-purple-900/50"; color = "text-purple-400"; }

                                return (
                                    <div key={i} onClick={() => setLocation(item.path)} className="group relative flex flex-col items-center text-center p-4 rounded-xl transition-all cursor-pointer h-full border hover:bg-white/10 border-transparent hover:border-white/10">
                                        <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform relative`}>
                                            <item.icon className={`w-6 h-6 ${color}`} />
                                            {item.progress > 80 && (
                                                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-slate-900">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Phase {i + 1}</div>
                                        <div className="font-semibold mb-1 text-white text-sm">{item.title}</div>
                                        <div className="text-xs text-slate-400 leading-snug">{item.description}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats / Metrics Grid like Governance */}
                <div id="iso-health-score" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-indigo-600 bg-indigo-50/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-900">ISMS Readiness</CardTitle>
                            <TrendingUp className="h-4 w-4 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-indigo-700">68%</div>
                            <p className="text-xs text-indigo-600 mt-1">Overall System Health</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 cursor-pointer hover:bg-amber-100/50 transition-colors" onClick={() => setLocation(`/clients/${clientId}/iso27001/soa`)}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-amber-900">Control Coverage</CardTitle>
                            <FileText className="h-4 w-4 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-700">93/93</div>
                            <p className="text-xs text-amber-600 mt-1">Annex A Controls Addressed</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500 bg-orange-50/50 cursor-pointer hover:bg-orange-100/50 transition-colors" onClick={() => setLocation(`/clients/${clientId}/iso27001/risks`)}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-900">Risk Profile</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-700">12</div>
                            <p className="text-xs text-orange-600 mt-1">High Risks Identified</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/50 cursor-pointer hover:bg-emerald-100/50 transition-colors" onClick={() => setLocation(`/clients/${clientId}/audit-manager`)}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-900">Audit Status</CardTitle>
                            <Shield className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-emerald-700">10%</div>
                            <p className="text-xs text-emerald-600 mt-1">Scheduled for this Quarter</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Findings/Activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="col-span-1 shadow-md border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4 mb-4">
                            <div>
                                <CardTitle className="text-xl">Compliance Timeline</CardTitle>
                                <CardDescription>Recent ISMS activities and evidence collections.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm">View All</Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {[
                                { title: "Risk Treatment Updated", meta: "2 hours ago", author: "Sarah Jones", type: "Risk" },
                                { title: "Internal Audit Stage 1 Started", meta: "Yesterday", author: "Internal Auditor", type: "Audit" },
                                { title: "Evidence Collected: A.8.1", meta: "2 days ago", author: "System Task", type: "Evidence" },
                                { title: "Policy Review Completed", meta: "3 days ago", author: "Michael Chen", type: "Governance" }
                            ].map((activity, i) => (
                                <div key={i} className="flex items-start gap-4 group">
                                    <div className="mt-1 flex flex-col items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform shadow-[0_0_0_4px_rgba(79,70,229,0.1)]" />
                                        {i < 3 && <div className="w-px h-12 bg-slate-100 mt-1" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-xs">{activity.title}</h4>
                                            <span className="text-[10px] text-slate-400 font-medium">{activity.meta}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">By {activity.author} • <span className="text-indigo-500 font-semibold">{activity.type}</span></p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-indigo-600 text-white shadow-xl shadow-indigo-100 overflow-hidden relative col-span-1">
                        <TrendingUp className="absolute bottom-0 right-0 -mb-8 -mr-8 h-48 w-48 text-white/5 opacity-50" />
                        <CardHeader>
                            <CardTitle className="text-white">Certification Readiness</CardTitle>
                            <CardDescription className="text-indigo-100">Projected target: March 2026</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
                                <h3 className="font-bold mb-3 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Next Steps
                                </h3>
                                <ul className="space-y-2 text-xs text-indigo-50">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1 h-1 bg-white rounded-full" /> Complete SoA Justifications
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1 h-1 bg-white rounded-full" /> Conduct Internal Audit
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1 h-1 bg-white rounded-full" /> Management Sign-off
                                    </li>
                                </ul>
                            </div>
                            <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-6 rounded-xl shadow-lg">
                                Run Readiness Report
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ISOLayout>
    );
}
