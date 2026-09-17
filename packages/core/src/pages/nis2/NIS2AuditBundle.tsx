/**
 * NIS2 Audit Documentation Page
 * 
 * Articles 20-29: Audit-ready compliance documentation
 * Generate comprehensive NIS2 compliance bundles
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { FileText, Shield, ArrowLeft, Briefcase, ClipboardCheck } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { NIS2AuditBundleGenerator } from '@/components/dashboard/NIS2AuditBundleGenerator';

export default function NIS2AuditBundle() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    return (
        <DashboardLayout fullWidth={true}>
            <div className="container mx-auto py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="p-3 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl shadow-lg">
                        <FileText className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Audit Documentation</h1>
                        <p className="text-muted-foreground">
                            Generate audit-ready NIS2 compliance bundles
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-slate-50 text-slate-700 border-slate-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Articles 20-29
                    </Badge>
                </div>

                {/* Description */}
                <Card>
                    <CardHeader>
                        <CardTitle>About NIS2 Audit Documentation</CardTitle>
                        <CardDescription>
                            Generate comprehensive documentation for regulatory audits and compliance verification
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                                    Compliance Evidence
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Documented evidence of security measures implementation
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-blue-600" />
                                    Management Approval
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Records of management oversight and sign-off
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-purple-600" />
                                    Incident Reports
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Documented incident handling and reporting procedures
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Bundle Generator */}
                <NIS2AuditBundleGenerator clientId={clientId} />
            </div>
        </DashboardLayout>
    );
}
