/**
 * NIS2 Cyber Resilience Hub
 * 
 * Navigation launcher for NIS2 compliance management
 * Provides access to all NIS2-related features and pages
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { trpc } from '@/lib/trpc';
import { Shield, Globe, Users, FileText, Building2, AlertTriangle, CheckCircle, Clock, ArrowRight, Scale, Briefcase, Flag } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";

export default function NIS2CyberResilienceHub() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    // Fetch NIS2 compliance data
    const { data: nis2Mappings, isLoading } = trpc.cyber.getMappings.useQuery(
        { clientId, framework: 'NIS2' },
        { enabled: !!clientId }
    );

    const { data: incidents } = trpc.cyber.getIncidents.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Calculate compliance score
    const complianceScore = nis2Mappings ? Math.round(
        (nis2Mappings.filter((m: any) => m.status === 'implemented').length / nis2Mappings.length) * 100
    ) : 0;

    // Navigation items
    const hubModules = [
        {
            id: 'entity-classification',
            title: 'Entity Classification',
            description: 'Determine if you are an Essential or Important entity under NIS2',
            icon: Building2,
            path: `/clients/${clientId}/nis2/entity-classification`,
            color: 'from-purple-500 to-indigo-600',
            article: 'Article 20'
        },
        {
            id: 'management-liability',
            title: 'Management Oversight',
            description: 'Track management liability and sign-off requirements',
            icon: Users,
            path: `/clients/${clientId}/nis2/management-liability`,
            color: 'from-blue-500 to-cyan-600',
            article: 'Article 20'
        },
        {
            id: 'security-measures',
            title: 'Security Measures',
            description: 'Technical and organizational security controls (Article 21)',
            icon: Shield,
            path: `/clients/${clientId}/nis2/security-measures`,
            color: 'from-green-500 to-emerald-600',
            article: 'Article 21'
        },
        {
            id: 'incident-reporting',
            title: 'Incident Reporting',
            description: '24h early warning, 72h notification, and final report deadlines',
            icon: AlertTriangle,
            path: `/cyber/incidents`,
            color: 'from-red-500 to-orange-600',
            article: 'Article 23'
        },
        {
            id: 'cross-border',
            title: 'Cross-Border Compliance',
            description: 'EU member state regulatory requirements and competent authorities',
            icon: Globe,
            path: `/clients/${clientId}/nis2/cross-border`,
            color: 'from-amber-500 to-yellow-600',
            article: 'Articles 25-26'
        },
        {
            id: 'audit-bundle',
            title: 'Audit Documentation',
            description: 'Generate audit-ready NIS2 compliance documentation',
            icon: FileText,
            path: `/clients/${clientId}/nis2/audit-bundle`,
            color: 'from-slate-500 to-gray-600',
            article: 'Articles 20-29'
        }
    ];

    return (
        <DashboardLayout fullWidth={true}>
            <div className="container mx-auto py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">NIS2 Cyber Resilience</h1>
                            <p className="text-muted-foreground">
                                EU Directive 2022/2555 compliance management
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Article 20-29
                    </Badge>
                </div>

                {/* Quick Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Compliance Score</CardDescription>
                            <CardTitle className="text-3xl">{complianceScore}%</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Progress value={complianceScore} className="h-2" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Security Measures</CardDescription>
                            <CardTitle className="text-3xl">
                                {nis2Mappings?.filter((m: any) => m.status === 'implemented').length || 0}
                                <span className="text-sm font-normal text-muted-foreground">/ {nis2Mappings?.length || 0}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Article 21 controls</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Active Incidents</CardDescription>
                            <CardTitle className="text-3xl">{incidents?.length || 0}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Article 23 reporting</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Status</CardDescription>
                            <CardTitle className="text-3xl">
                                {complianceScore >= 80 ? 'Good' : complianceScore >= 50 ? 'Attention' : 'Critical'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {complianceScore >= 80 ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : complianceScore >= 50 ? (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                                <Clock className="h-4 w-4 text-red-500" />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Module Grid */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">NIS2 Compliance Modules</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {hubModules.map((module) => (
                            <Card
                                key={module.id}
                                className="hover:shadow-lg transition-shadow cursor-pointer group"
                                onClick={() => setLocation(module.path)}
                            >
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${module.color}`}>
                                            <module.icon className="h-5 w-5 text-white" />
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {module.article}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-lg mt-4">{module.title}</CardTitle>
                                    <CardDescription>{module.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="ghost" className="w-full group-hover:bg-slate-100">
                                        Open Module
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-purple-200 bg-purple-50/50">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-purple-600" />
                                <div>
                                    <CardTitle>Entity Classification</CardTitle>
                                    <CardDescription>Determine your NIS2 entity type</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setLocation(`/clients/${clientId}/nis2/entity-classification`)}
                            >
                                Start Classification Wizard
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-amber-600" />
                                <div>
                                    <CardTitle>Audit Documentation</CardTitle>
                                    <CardDescription>Generate compliance bundle</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setLocation(`/clients/${clientId}/nis2/audit-bundle`)}
                            >
                                Generate Audit Bundle
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
