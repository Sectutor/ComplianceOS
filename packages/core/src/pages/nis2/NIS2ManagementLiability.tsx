/**
 * NIS2 Management Liability Page
 * 
 * Article 20: Management oversight and liability
 * Tracks management sign-off requirements and accountability
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { Users, Shield, AlertCircle, CheckCircle, Clock, ArrowLeft, Building2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { ManagementLiabilityTracker } from '@/components/dashboard/ManagementLiabilityTracker';

export default function NIS2ManagementLiability() {
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
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                        <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Management Oversight</h1>
                        <p className="text-muted-foreground">
                            Article 20 - Management liability and accountability
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700 border-blue-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Article 20
                    </Badge>
                </div>

                {/* Description */}
                <Card>
                    <CardHeader>
                        <CardTitle>About Article 20 - Management Oversight</CardTitle>
                        <CardDescription>
                            NIS2 requires management bodies to approve and supervise the implementation of cybersecurity measures
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    Approval
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Management must approve cybersecurity policies and risk management measures
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                    Supervision
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Ongoing oversight of security measures implementation and effectiveness
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    Liability
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Management can be held liable for non-compliance with NIS2 requirements
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Management Liability Tracker */}
                <ManagementLiabilityTracker clientId={clientId} />
            </div>
        </DashboardLayout>
    );
}
