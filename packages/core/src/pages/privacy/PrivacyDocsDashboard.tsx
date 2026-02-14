import React from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { PrivacyLayout } from "./PrivacyLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, FileText, Shield, Globe, Lock, Loader2 } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@complianceos/ui/ui/table";

export default function PrivacyDocsDashboard() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [location, setLocation] = useLocation();

    const { data: policies, isLoading } = trpc.clientPolicies.list.useQuery({
        clientId,
        module: 'privacy'
    }, { enabled: !!clientId });

    return (
        <PrivacyLayout clientId={clientId}>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Privacy Documentation</h1>
                        <p className="text-muted-foreground">Manage your privacy policies, notices, and procedural documents.</p>
                    </div>
                    <Button onClick={() => setLocation(`/clients/${clientId}/policies/new?module=privacy`)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Document
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                    <div className="space-y-6">
                        {/* Recommended Docs Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="bg-slate-50/50 border-dashed">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <Shield className="h-5 w-5 text-blue-600" />
                                        {policies?.some(p => p.name.includes("Privacy Policy")) && <Badge variant="secondary" className="bg-green-100 text-green-800">Detected</Badge>}
                                    </div>
                                    <CardTitle className="text-base mt-2">Privacy Policy</CardTitle>
                                    <CardDescription>Public-facing notice explaining data practices.</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="bg-slate-50/50 border-dashed">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <Globe className="h-5 w-5 text-indigo-600" />
                                        {policies?.some(p => p.name.includes("Cookie")) && <Badge variant="secondary" className="bg-green-100 text-green-800">Detected</Badge>}
                                    </div>
                                    <CardTitle className="text-base mt-2">Cookie Policy</CardTitle>
                                    <CardDescription>Details about tracking technologies used.</CardDescription>
                                </CardHeader>
                            </Card>
                            <Card className="bg-slate-50/50 border-dashed">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <Lock className="h-5 w-5 text-amber-600" />
                                        {policies?.some(p => p.name.includes("Retention")) && <Badge variant="secondary" className="bg-green-100 text-green-800">Detected</Badge>}
                                    </div>
                                    <CardTitle className="text-base mt-2">Data Retention Policy</CardTitle>
                                    <CardDescription>Internal rules for data storage duration.</CardDescription>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* List of Policies */}
                        <div className="rounded-md border bg-white shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Version</TableHead>
                                        <TableHead>Last Updated</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {policies && policies.length > 0 ? (
                                        policies.map((policy) => (
                                            <TableRow key={policy.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/policies/${policy.id}`)}>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    {policy.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={policy.status === 'approved' ? 'default' : 'secondary'}>
                                                        {policy.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>v{policy.version}</TableCell>
                                                <TableCell>{new Date(policy.updatedAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">Edit</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                No privacy documents found. Click "Add Document" to create one.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </PrivacyLayout>
    );
}
