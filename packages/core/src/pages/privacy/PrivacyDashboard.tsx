import React from 'react';
import { useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, Shield, CheckCircle, FileText, Users, AlertTriangle, Database } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Loader2 } from "lucide-react";

export default function PrivacyDashboard({ fullWidth }: { fullWidth?: boolean }) {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [, setLocation] = useLocation();

    const { data: stats, isLoading: statsLoading } = trpc.privacy.getPrivacyStats.useQuery({ clientId }, { enabled: !!clientId });
    const { data: dsars, isLoading: dsarLoading } = trpc.privacy.getDsarRequests.useQuery({ clientId }, { enabled: !!clientId });
    const { data: assessments } = trpc.privacy.listAssessments.useQuery({ clientId }, { enabled: !!clientId });

    // Calculate pending DSARs
    const pendingDsars = dsars?.filter(d => d.status !== 'Completed' && d.status !== 'Rejected').length || 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Privacy Dashboard</h1>
                <p className="text-muted-foreground">Overview of your privacy program status and compliance.</p>
            </div>

            {statsLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">PII Assets</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.piiAssetCount || 0}</div>
                            <p className="text-xs text-muted-foreground">Identified personal data assets</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active DSARs</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{pendingDsars}</div>
                            <p className="text-xs text-muted-foreground">Requests requiring action</p>
                        </CardContent>
                    </Card>
                    {/* Other cards can be added later or hardcoded for now if backend doesn't support them yet */}
                </div>
            )}



            <div className="grid gap-6 lg:grid-cols-2 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent DSAR Requests</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* List DSARs */}
                        {dsars && dsars.slice(0, 5).map(dsar => (
                            <div key={dsar.id} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-slate-50 transition-colors cursor-pointer px-2 rounded-sm" onClick={() => setLocation(`/clients/${clientId}/privacy/dsar/${dsar.id}`)}>
                                <div>
                                    <p className="font-medium text-sm">{dsar.requestId}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {dsar.requestDate ? new Date(dsar.requestDate).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${dsar.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                        dsar.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                        {dsar.status || 'Draft'}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!dsars || dsars.length === 0) && <p className="text-sm text-muted-foreground text-center py-8">No recent requests found.</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Assessments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {assessments && assessments.slice(0, 5).map(assessment => (
                            <div key={assessment.id} className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-slate-50 transition-colors cursor-pointer px-2 rounded-sm">
                                <div className="space-y-1">
                                    <p className="font-medium text-sm truncate max-w-[200px]">{assessment.type.replace(/^(DPIA:|TIA:|BREACH:)\s*/, '')}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">
                                            {assessment.type.split(':')[0]}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(assessment.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${assessment.status === 'completed' ? 'bg-green-100 text-green-800' : assessment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'}`}>
                                    {assessment.status === 'in_progress' ? 'Active' : assessment.status}
                                </span>
                            </div>
                        ))}
                        {(!assessments || assessments.length === 0) && <p className="text-sm text-muted-foreground text-center py-8">No recent assessments.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
