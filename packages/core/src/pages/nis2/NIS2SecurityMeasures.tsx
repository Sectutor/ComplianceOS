/**
 * NIS2 Security Measures Page
 * 
 * Article 21: Technical and organizational security measures
 * 12 categories of security controls
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { Shield, ArrowLeft, Lock, AlertTriangle, Activity, Users, Database, Globe, Server, FileText, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Article 21 security measure categories
const SECURITY_MEASURES = [
    { id: 'policies', name: 'Policies & Procedures', description: 'Information security policies and procedures', icon: FileText, article: '21(2)(a)' },
    { id: 'risk_mgmt', name: 'Risk Management', description: 'Cybersecurity risk management measures', icon: AlertTriangle, article: '21(2)(b)' },
    { id: 'incident_handling', name: 'Incident Handling', description: 'Detection, response, and recovery capabilities', icon: Activity, article: '21(2)(c)' },
    { id: 'business_continuity', name: 'Business Continuity', description: 'Backup and disaster recovery', icon: Server, article: '21(2)(d)' },
    { id: 'supply_chain', name: 'Supply Chain Security', description: 'Security in supplier relationships', icon: Globe, article: '21(2)(e)' },
    { id: 'asset_mgmt', name: 'Asset Management', description: 'Inventory and classification of assets', icon: Database, article: '21(2)(f)' },
    { id: 'cryptography', name: 'Cryptography', description: 'Encryption and key management', icon: Lock, article: '21(2)(g)' },
    { id: 'access_control', name: 'Access Control', description: 'Identity and access management', icon: Users, article: '21(2)(h)' },
    { id: 'training', name: 'Security Training', description: 'Staff awareness and training', icon: Shield, article: '21(2)(i)' },
    { id: 'notifications', name: 'Incident Notifications', description: 'Reporting obligations compliance', icon: Activity, article: '21(2)(j)' },
    { id: 'vulnerability', name: 'Vulnerability Management', description: 'Detection and remediation of vulnerabilities', icon: AlertTriangle, article: '21(2)(k)' },
    { id: 'evaluation', name: 'Security Evaluation', description: 'Periodic security assessments', icon: CheckCircle, article: '21(2)(l)' }
];

export default function NIS2SecurityMeasures() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    // Query NIS2 mappings from trpc
    const { data: nis2Data, isLoading: isLoadingMappings } = trpc.cyber.getMappings.useQuery(
        { clientId, framework: 'NIS2' },
        { enabled: !!clientId }
    );

    // Calculate metrics from real data
    const total = SECURITY_MEASURES.length;

    // Group mappings by article
    const articleStats: Record<string, { implemented: number; inProgress: number; notStarted: number; total: number }> = {};

    if (nis2Data) {
        nis2Data.forEach((mapping: any) => {
            const article = mapping.nis2Article;
            if (!articleStats[article]) {
                articleStats[article] = { implemented: 0, inProgress: 0, notStarted: 0, total: 0 };
            }
            articleStats[article].total++;
            if (mapping.clientStatus === 'implemented') {
                articleStats[article].implemented++;
            } else if (mapping.clientStatus === 'in_progress') {
                articleStats[article].inProgress++;
            } else {
                articleStats[article].notStarted++;
            }
        });
    }

    // Calculate overall progress
    const implemented = nis2Data ? nis2Data.filter((m: any) => m.clientStatus === 'implemented').length : 0;
    const inProgress = nis2Data ? nis2Data.filter((m: any) => m.clientStatus === 'in_progress').length : 0;
    const notStarted = total - implemented - inProgress;
    const progress = total > 0 ? Math.round((implemented / total) * 100) : 0;

    const utils = trpc.useUtils();
    const syncMutation = trpc.cyber.autoSyncNis2FromIso.useMutation({
        onSuccess: () => {
            toast.success("Security Measures Synced", {
                description: "Mapped ISO 27001 verified controls to NIS2 Article 21 domains."
            });
            utils.cyber.getMappings.invalidate({ clientId, framework: 'NIS2' });
        },
        onError: (err: any) => {
            toast.error("Sync Failed", { description: err.message });
        }
    });

    if (isLoadingMappings) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="container mx-auto py-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <Shield className="h-12 w-12 mx-auto text-green-500 animate-pulse" />
                            <p className="mt-4 text-muted-foreground">Loading security measures...</p>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout fullWidth={true}>
            <div className="container mx-auto py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Security Measures</h1>
                            <p className="text-muted-foreground">
                                Article 21 - Technical and organizational security measures
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => syncMutation.mutate({ clientId })}
                            disabled={syncMutation.isPending || !clientId}
                            className="gap-2 border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100 font-semibold"
                        >
                            <RefreshCw className={cn("h-4 w-4 text-emerald-600", syncMutation.isPending && "animate-spin")} />
                            {syncMutation.isPending ? "Syncing Controls..." : "Sync from ISO 27001 Controls"}
                        </Button>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Shield className="h-3 w-3 mr-1" />
                            Article 21
                        </Badge>
                    </div>
                </div>

                {/* Progress Overview */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Overall Progress</CardDescription>
                            <CardTitle className="text-3xl">{progress}%</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Progress value={progress} className="h-2" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Implemented</CardDescription>
                            <CardTitle className="text-3xl">{implemented}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">of {total} measures</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>In Progress</CardDescription>
                            <CardTitle className="text-3xl">{inProgress}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">measures</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Not Started</CardDescription>
                            <CardTitle className="text-3xl">{notStarted > 0 ? notStarted : 0}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">measures</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Description */}
                <Card>
                    <CardHeader>
                        <CardTitle>About Article 21 - Security Measures</CardTitle>
                        <CardDescription>
                            NIS2 requires appropriate technical and organizational measures to manage cybersecurity risks
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Article 21(2) specifies 12 categories of security measures that essential and important entities
                            must implement. The measures should be appropriate to the risks faced by the organization.
                        </p>
                    </CardContent>
                </Card>

                {/* Security Measures Grid */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Article 21 Security Measure Categories</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {SECURITY_MEASURES.map((measure) => {
                            // Get stats for this article
                            const stats = articleStats[measure.article] || { implemented: 0, inProgress: 0, notStarted: 0, total: 0 };
                            const measureProgress = stats.total > 0
                                ? Math.round(((stats.implemented + (stats.inProgress * 0.5)) / stats.total) * 100)
                                : 0;
                            const statusColor = measureProgress >= 80 ? 'bg-green-500' : measureProgress >= 40 ? 'bg-amber-500' : 'bg-slate-300';

                            return (
                                <Card key={measure.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="p-2 rounded-lg bg-green-50">
                                                <measure.icon className="h-5 w-5 text-green-600" />
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {measure.article}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-base mt-3">{measure.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{measure.description}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${statusColor} rounded-full transition-all`}
                                                    style={{ width: `${measureProgress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {measureProgress}%
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}


