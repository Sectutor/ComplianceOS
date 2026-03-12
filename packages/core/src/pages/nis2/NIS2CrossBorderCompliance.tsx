/**
 * NIS2 Cross-Border Compliance Page
 * 
 * Articles 25-26: Cross-border cooperation and competent authorities
 * EU member state regulatory requirements
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { Globe, Shield, ArrowLeft, MapPin, Building2, Phone, Mail } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { CrossBorderComplianceDashboard } from '@/components/dashboard/CrossBorderComplianceDashboard';

export default function NIS2CrossBorderCompliance() {
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
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg">
                        <Globe className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Cross-Border Compliance</h1>
                        <p className="text-muted-foreground">
                            EU member state regulatory requirements and competent authorities
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-700 border-amber-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Articles 25-26
                    </Badge>
                </div>

                {/* Description */}
                <Card>
                    <CardHeader>
                        <CardTitle>About Articles 25-26 - Cross-Border Cooperation</CardTitle>
                        <CardDescription>
                            NIS2 requires coordination between EU member state competent authorities
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-amber-600" />
                                    European Cooperation
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    ENISA facilitates cooperation among competent authorities across the EU
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-blue-600" />
                                    National Authorities
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Each member state designates competent authorities for NIS2 enforcement
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-purple-600" />
                                    Essential Entities
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Direct supervision by competent authorities for essential entities
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Cross-Border Dashboard */}
                <CrossBorderComplianceDashboard clientId={clientId} />
            </div>
        </DashboardLayout>
    );
}
