import { useParams, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Shield, CheckSquare, Link as LinkIcon, ClipboardCheck, AlertTriangle, FileText, ArrowRight, LayoutDashboard, BookOpen } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@complianceos/ui/ui/badge";
import { ChecklistProgressWidget } from "@/components/readiness/ChecklistProgressWidget";

export default function ClientCompliancePage() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");

    // Fetch Data
    const { data: client, isLoading: clientLoading } = trpc.clients.get.useQuery({ id: clientId }, { enabled: clientId > 0 });
    const { data: complianceScore, isLoading: scoreLoading } = trpc.clients.getComplianceScore.useQuery({ clientId }, { enabled: clientId > 0 });
    const { data: coverage, isLoading: coverageLoading } = trpc.clients.getPolicyCoverageAnalysis.useQuery({ clientId }, { enabled: clientId > 0 });
    const { data: controls, isLoading: controlsLoading } = trpc.clientControls.list.useQuery({ clientId }, { enabled: clientId > 0 });

    const loading = clientLoading || scoreLoading || coverageLoading || controlsLoading;

    // Framework Stats (still calculated from controls for detailed breakdown if not available in score)
    // Ideally score should provide this, but controls list is fine for now.
    const frameworkStats = useMemo(() => {
        if (!controls) return [];
        const frameworks = Array.from(new Set(controls.map(c => c.framework))).filter(Boolean);
        return frameworks.map(fw => {
            const fwControls = controls.filter(c => c.framework === fw);
            const fwImplemented = fwControls.filter(c => c.status === 'implemented').length;
            return {
                name: fw,
                total: fwControls.length,
                implemented: fwImplemented,
                progress: fwControls.length > 0 ? Math.round((fwImplemented / fwControls.length) * 100) : 0
            };
        });
    }, [controls]);

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
                    <div className="text-muted-foreground flex items-center gap-2">
                        Monitor compliance across frameworks and controls for
                        {clientLoading ? (
                            <Skeleton className="h-5 w-32 inline-block" />
                        ) : (
                            <span className="font-medium text-foreground">{client?.name}</span>
                        )}
                        .
                    </div>
                </div>

                {/* Overview Callout */}
                <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex gap-4 items-center">
                            <div className="p-2 bg-amber-100 rounded-lg hidden sm:block">
                                <BookOpen className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-amber-900 text-base">Audit Readiness Guide</h3>
                                <p className="text-amber-700/80 text-sm">
                                    Step-by-step workflow to prepare for ISO 27001, SOC 2, and other audits.
                                </p>
                            </div>
                        </div>
                        <Link href={`/clients/${clientId}/compliance/overview`}>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold whitespace-nowrap">
                                View Workflow <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Top Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 rounded-xl border-none shadow-lg shadow-blue-200 dark:shadow-none bg-blue-600 text-white flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/80 font-medium">Overall Readiness</p>
                            {loading ? (
                                <div className="h-8 w-16 bg-white/20 animate-pulse rounded mt-1" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold mt-1 text-white">{complianceScore?.complianceScore || 0}%</p>
                                    <p className="text-xs text-white/60 mt-1">Combined score</p>
                                    <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden mt-2">
                                        <div
                                            className="h-full bg-white transition-all duration-500"
                                            style={{ width: `${complianceScore?.complianceScore || 0}%` }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-3 rounded-lg bg-white/20 backdrop-blur-md">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border-none shadow-lg shadow-emerald-200 dark:shadow-none bg-emerald-600 text-white flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/80 font-medium">Controls Implemented</p>
                            {loading ? (
                                <div className="h-8 w-16 bg-white/20 animate-pulse rounded mt-1" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold mt-1 text-white">
                                        {complianceScore?.implementedControls || 0} <span className="text-sm font-normal text-white/70">/ {complianceScore?.totalControls || 0}</span>
                                    </p>
                                    <p className="text-xs text-white/60 mt-1">Total controls</p>
                                </>
                            )}
                        </div>
                        <div className="p-3 rounded-lg bg-white/20 backdrop-blur-md">
                            <CheckSquare className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border-none shadow-lg shadow-amber-200 dark:shadow-none bg-amber-500 text-white flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/80 font-medium">Policy Mapping</p>
                            {loading ? (
                                <div className="h-8 w-16 bg-white/20 animate-pulse rounded mt-1" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold mt-1 text-white">{coverage?.coveragePercentage || 0}%</p>
                                    <p className="text-xs text-white/60 mt-1">{coverage?.mappedControls || 0} controls mapped</p>
                                </>
                            )}
                        </div>
                        <div className="p-3 rounded-lg bg-white/20 backdrop-blur-md">
                            <LinkIcon className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border-none shadow-lg shadow-purple-200 dark:shadow-none bg-purple-600 text-white flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/80 font-medium">Frameworks</p>
                            {controlsLoading ? (
                                <div className="h-8 w-16 bg-white/20 animate-pulse rounded mt-1" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold mt-1 text-white">{frameworkStats.length}</p>
                                    <p className="text-xs text-white/60 mt-1">Active frameworks</p>
                                </>
                            )}
                        </div>
                        <div className="p-3 rounded-lg bg-white/20 backdrop-blur-md">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>


                {/* Readiness Checklist Widget */}
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-1">
                        <ChecklistProgressWidget clientId={clientId} />
                    </div>
                    <div className="md:col-span-3">
                        {/* Placeholder for future widgets or leave empty for layout balance */}
                    </div>
                </div>

                {/* Framework Breakdown */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {frameworkStats.map((fw) => (
                        <Card key={fw.name}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold">{fw.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Readiness</span>
                                            <span className="font-bold">{fw.progress}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-300"
                                                style={{ width: `${fw.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                                        <span className="text-muted-foreground">Implemented</span>
                                        <span>{fw.implemented} / {fw.total}</span>
                                    </div>
                                    <Link href={`/clients/${clientId}/controls?framework=${encodeURIComponent(fw.name)}`}>
                                        <Button variant="outline" className="w-full h-8 text-xs mt-2">View Controls</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gap Analysis Summary</CardTitle>
                            <CardDescription>Recent identified gaps</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                {coverage && coverage.unmappedControls > 0 ? (
                                    <>
                                        <AlertTriangle className="h-8 w-8 mb-2 text-warning" />
                                        <p className="font-medium text-foreground">{coverage.unmappedControls} controls unmapped</p>
                                        <p className="text-sm mb-4">These controls lack policy coverage.</p>
                                        <Link href={`/clients/${clientId}/policies`}>
                                            <Button variant="outline" size="sm">Map Policies</Button>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <CheckSquare className="h-8 w-8 mb-2 text-emerald-500 opacity-20" />
                                        <p>No policy gaps identified</p>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Evidence Coverage</CardTitle>
                            <CardDescription>Controls with linked evidence</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                <ClipboardCheck className="h-8 w-8 mb-2 opacity-20" />
                                <div className="text-2xl font-bold text-foreground">{complianceScore?.evidenceStatus.verified || 0}</div>
                                <p className="text-sm">Verified Evidence Items</p>
                                <Link href={`/clients/${clientId}/evidence`}>
                                    <Button variant="link" size="sm" className="mt-2">Go to Evidence</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout >
    );
}
