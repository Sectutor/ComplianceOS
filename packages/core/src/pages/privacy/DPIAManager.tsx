import React from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, FileText, Play, Loader2, Clock } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";

export default function DPIAManager() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [location, setLocation] = useLocation();

    // Fetch templates
    const { data: templates, isLoading: templatesLoading } = trpc.privacyEnhancements.dpiaTemplates.list.useQuery({ clientId }, { enabled: !!clientId });

    // Fetch past assessments
    const { data: pastAssessments, isLoading: assessmentsLoading } = trpc.privacy.listAssessments.useQuery({
        clientId,
        typePrefix: "DPIA:"
    }, { enabled: !!clientId });

    return (
        <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">DPIA Manager</h1>
                        <p className="text-muted-foreground">Conduct and manage Data Protection Impact Assessments (DPIAs).</p>
                    </div>
                </div>

                {/* Templates Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5" /> Available Templates
                        </h2>
                        <Button variant="outline" onClick={() => toast.info("Template creation wizard coming next.")}>
                            <Plus className="mr-2 h-4 w-4" /> Create Template
                        </Button>
                    </div>

                    {templatesLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {templates && templates.length > 0 ? (
                                templates.map(t => (
                                    <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg">{t.name}</CardTitle>
                                            </div>
                                            <CardDescription className="line-clamp-2">{t.description || 'No description provided.'}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                                                <span>Usage: {t.usageCount || 0}</span>
                                                <span>v{t.version || '1.0'}</span>
                                            </div>
                                            <Button className="w-full" onClick={() => setLocation(`/clients/${clientId}/privacy/dpia/new?templateId=${t.id}`)}>
                                                <Play className="mr-2 h-4 w-4" /> Start Assessment
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full text-center p-8 border rounded-md border-dashed bg-slate-50">
                                    <p className="text-muted-foreground mb-4">No templates found.</p>
                                    <Button variant="secondary" onClick={() => toast.info("Template creation wizard coming next.")}>
                                        <Plus className="mr-2 h-4 w-4" /> Create Custom Template
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Past Assessments Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Clock className="h-5 w-5" /> Assessment History
                        </h2>
                    </div>

                    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Assessment Name</TableHead>
                                    <TableHead>Risk Level</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assessmentsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell>
                                    </TableRow>
                                ) : pastAssessments && pastAssessments.length > 0 ? (
                                    pastAssessments.map((a) => (
                                        <TableRow key={a.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium">{a.type.replace("DPIA: ", "")}</TableCell>
                                            <TableCell>{a.score ? `Score: ${a.score}` : 'Pending'}</TableCell>
                                            <TableCell>
                                                <Badge variant={a.status === 'completed' ? 'default' : a.status === 'in_progress' ? 'secondary' : 'outline'}>
                                                    {a.status || 'Not Started'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(a.updatedAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => toast.info("View details coming soon")}>
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            No past assessments found. Start a new one from the templates above.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>
    );
}
