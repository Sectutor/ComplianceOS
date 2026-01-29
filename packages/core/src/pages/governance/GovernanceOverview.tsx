
import React from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    Shield,
    FileText,
    Zap,
    ListTodo,
    Target,
    BookOpen,
    ArrowRight,
    CheckCircle,
    TrendingUp,
    Activity,
    AlertTriangle,
    Layers,
    Users
} from "lucide-react";

export default function GovernanceOverview() {
    const params = useParams();
    const clientId = parseInt(params.id || "0");

    // Fetch Data
    const { data: govStats } = trpc.governance.getStats.useQuery({ clientId });
    const { data: readinessData } = trpc.compliance.getReadinessData.useQuery({ clientId });

    // Calculate Percentages
    const policyPercentage = readinessData?.coverage?.policyStats?.total
        ? Math.round((readinessData.coverage.policyStats.approved / readinessData.coverage.policyStats.total) * 100)
        : 0;

    const controlPercentage = readinessData?.coverage?.controlStats?.total
        ? Math.round((readinessData.coverage.controlStats.implemented / readinessData.coverage.controlStats.total) * 100)
        : 0;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Governance Framework</h1>
                        <p className="text-muted-foreground mt-2">
                            Establish robust governance, manage policies, and orchestrate compliance workflows.
                        </p>
                    </div>
                </div>

                {/* Program Overview Callout */}
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 mb-6">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex gap-4 items-center">
                            <div className="p-3 bg-indigo-100 rounded-xl hidden sm:block">
                                <BookOpen className="w-8 h-8 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 text-lg">Governance Program Guide</h3>
                                <p className="text-indigo-700/80 max-w-2xl">
                                    Learn how to build a strategic GRC program, from defining roles (RACI) to automating controls.
                                </p>
                            </div>
                        </div>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold whitespace-nowrap">
                            View Guide <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Workflow Introduction Section */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-lg overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-indigo-400" />
                            Getting Started with Governance
                        </CardTitle>
                        <CardDescription className="text-slate-300">
                            Follow this linear workflow to establish your compliance baseline.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                            {/* Connector Line (Desktop) */}
                            <div className="hidden md:block absolute top-6 left-10 right-10 h-0.5 bg-slate-700 -z-10"></div>

                            {[
                                {
                                    step: "1. Roles",
                                    title: "Define RACI",
                                    desc: "Assign accountability and roles via RACI matrix.",
                                    link: `/clients/${clientId}/raci-matrix`,
                                    icon: Users,
                                    color: "text-blue-400",
                                    bg: "bg-blue-900/50",
                                    isComplete: false // Logic TBD
                                },
                                {
                                    step: "2. Controls",
                                    title: "Implement Controls",
                                    desc: "Deploy security controls from frameworks.",
                                    link: `/clients/${clientId}/controls`,
                                    icon: Shield,
                                    color: "text-emerald-400",
                                    bg: "bg-emerald-900/50",
                                    isComplete: (readinessData?.controlStats?.implemented || 0) > 0
                                },
                                {
                                    step: "3. Policies",
                                    title: "Write Policies",
                                    desc: "Draft and approve organizational policies.",
                                    link: `/clients/${clientId}/policies`,
                                    icon: FileText,
                                    color: "text-amber-400",
                                    bg: "bg-amber-900/50",
                                    isComplete: (readinessData?.policyStats?.approved || 0) > 0
                                },
                                {
                                    step: "4. Automate",
                                    title: "Workflows",
                                    desc: "Set up automated evidence collection.",
                                    link: `/clients/${clientId}/workflows`,
                                    icon: Zap,
                                    color: "text-purple-400",
                                    bg: "bg-purple-900/50",
                                    isComplete: false
                                },
                                {
                                    step: "5. Plan",
                                    title: "Roadmap",
                                    desc: "Build strategic multi-year plans.",
                                    link: `/clients/${clientId}/roadmap/dashboard`,
                                    icon: Target,
                                    color: "text-pink-400",
                                    bg: "bg-pink-900/50",
                                    isComplete: false
                                },
                            ].map((item, i) => (
                                <Link key={i} href={item.link}>
                                    <div className={`group relative flex flex-col items-center text-center p-4 rounded-xl transition-all cursor-pointer h-full border ${item.isComplete ? 'bg-white/5 border-emerald-500/30' : 'hover:bg-white/10 border-transparent hover:border-white/10'}`}>
                                        <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform relative`}>
                                            <item.icon className={`w-6 h-6 ${item.color}`} />
                                            {item.isComplete && (
                                                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-slate-900">
                                                    <CheckCircle className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{item.step}</div>
                                        <div className="font-semibold mb-1 text-white">{item.title}</div>
                                        <div className="text-xs text-slate-400 leading-snug">{item.desc}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Governance Health Score */}
                    <Card className="card-enhanced border-l-4 border-l-indigo-600 bg-indigo-50/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-900">Governance Health</CardTitle>
                            <Activity className="h-4 w-4 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-indigo-700">{govStats?.healthScore || 0}%</div>
                            <p className="text-xs text-indigo-600 mt-1">Overall System Health</p>
                        </CardContent>
                    </Card>

                    {/* Policy Status */}
                    <Card className="card-enhanced border-l-4 border-l-amber-500 bg-amber-50/50 cursor-pointer hover:bg-amber-100/50 transition-colors" onClick={() => window.location.href = `/clients/${clientId}/policies`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-amber-900">Policy Coverage</CardTitle>
                            <FileText className="h-4 w-4 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-700">{policyPercentage}%</div>
                            <p className="text-xs text-amber-600 mt-1">
                                {readinessData?.policyStats?.approved || 0} / {readinessData?.policyStats?.total || 0} Approved
                            </p>
                        </CardContent>
                    </Card>

                    {/* Control Readiness */}
                    <Card className="card-enhanced border-l-4 border-l-emerald-600 bg-emerald-50/50 cursor-pointer hover:bg-emerald-100/50 transition-colors" onClick={() => window.location.href = `/clients/${clientId}/controls`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-900">Control Readiness</CardTitle>
                            <Shield className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-emerald-700">{controlPercentage}%</div>
                            <p className="text-xs text-emerald-600 mt-1">
                                {readinessData?.controlStats?.implemented || 0} / {readinessData?.controlStats?.total || 0} Implemented
                            </p>
                        </CardContent>
                    </Card>

                    {/* Open Tasks */}
                    <Card className="card-enhanced border-l-4 border-l-red-500 bg-red-50/50 cursor-pointer hover:bg-red-100/50 transition-colors" onClick={() => window.location.href = `/clients/${clientId}/governance/workbench`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-900">Pending Actions</CardTitle>
                            <ListTodo className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-700">{govStats?.pending || 0}</div>
                            <p className="text-xs text-red-600 mt-1">
                                {govStats?.critical || 0} Critical • {govStats?.overdue || 0} Overdue
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Placeholder for future Chart or List */}
                    <Card className="col-span-1 min-h-[300px] flex items-center justify-center bg-slate-50 border-dashed">
                        <div className="text-center text-muted-foreground">
                            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Governance Activity Chart <br /> (Coming Soon)</p>
                        </div>
                    </Card>

                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Common governance tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <Link href={`/clients/${clientId}/policies/new`}>
                                <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 hover:bg-amber-50 hover:border-amber-200">
                                    <FileText className="mr-4 h-6 w-6 text-amber-500" />
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Draft New Policy</span>
                                        <span className="text-xs text-muted-foreground">Create a policy using AI templates</span>
                                    </div>
                                </Button>
                            </Link>
                            <Link href={`/clients/${clientId}/controls`}>
                                <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 hover:bg-emerald-50 hover:border-emerald-200">
                                    <Shield className="mr-4 h-6 w-6 text-emerald-500" />
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Map Controls</span>
                                        <span className="text-xs text-muted-foreground">Link controls to frameworks</span>
                                    </div>
                                </Button>
                            </Link>
                            <Link href={`/clients/${clientId}/governance/workbench`}>
                                <Button variant="outline" className="w-full justify-start h-auto py-4 px-4 hover:bg-red-50 hover:border-red-200">
                                    <ListTodo className="mr-4 h-6 w-6 text-red-500" />
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Manage Tasks</span>
                                        <span className="text-xs text-muted-foreground">Review pending governance items</span>
                                    </div>
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
