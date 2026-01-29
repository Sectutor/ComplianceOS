
import React, { useState } from 'react';
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { FileText, Download, Trash2, Calendar, FileBarChart, Plus } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from 'sonner';
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";


import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";
import ImplementationReportDialog from '../implementation/ImplementationReportDialog';

interface ReportsDashboardProps {
    clientId: number;
}

export const ReportsDashboard = ({ clientId }: ReportsDashboardProps) => {
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState<{ id: number; title: string } | null>(null);
    const [_, setLocation] = useLocation();
    const utils = trpc.useContext();

    const { data: reports, isLoading } = trpc.reports.getReportHistory.useQuery({
        clientId,
        limit: 20
    });

    const deleteMutation = trpc.reports.deleteReport.useMutation({
        onSuccess: () => {
            toast.success("Report deleted");
            utils.reports.getReportHistory.invalidate();
            setDeleteDialogOpen(false);
            setReportToDelete(null);
        },
        onError: (error) => {
            toast.error(`Failed to delete report: ${error.message}`);
        }
    });

    const handleDeleteClick = (report: { id: number; title: string }) => {
        setReportToDelete(report);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (reportToDelete) {
            deleteMutation.mutate({ reportId: reportToDelete.id });
        }
    };

    const downloadMutation = trpc.reports.downloadReport.useQuery({
        reportId: 0 // Placeholder, we handle logic in click
    }, { enabled: false });

    // Handle download manually via utils to avoid hook rules in loop
    const handleDownload = async (reportId: number, title: string) => {
        try {
            const result = await utils.client.reports.downloadReport.query({ reportId });
            // Create download link
            const link = document.createElement('a');
            link.href = `data:${result.mimeType};base64,${result.data}`;
            link.download = result.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Download started");
        } catch (e) {
            toast.error("Failed to download report");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Reports & Documentation</h2>
                    <p className="text-slate-500">Manage and generate compliance artifacts.</p>
                </div>
                <Button onClick={() => setIsGenerateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Report
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Summary Cards */}
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Total Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{reports?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-800">Last Generated</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-purple-900">
                            {reports?.[0] ? new Date(reports[0].generatedAt).toLocaleDateString() : 'Never'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileBarChart className="w-5 h-5 text-slate-500" />
                        Report History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-8 text-center text-slate-500">Loading reports...</div>
                    ) : !reports || reports.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border-dashed border-2 border-slate-200">
                            No reports generated yet.
                        </div>
                    ) : (
                        <ScrollArea className="h-[500px] pr-4">
                            <div className="space-y-4">
                                {reports.map((report: any) => (
                                    <div
                                        key={report.id}
                                        className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow group cursor-pointer"
                                        onDoubleClick={() => setLocation(`/clients/${clientId}/reports/${report.id}`)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                <FileText className="w-6 h-6 text-slate-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{report.title}</h4>
                                                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                                    <Badge variant="secondary" className="text-xs font-normal">
                                                        {report.version || 'v1.0'}
                                                    </Badge>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(report.generatedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="hidden group-hover:flex"
                                                onClick={() => setLocation(`/clients/${clientId}/reports/${report.id}`)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(report.id, report.title)}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDeleteClick(report)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            <ImplementationReportDialog
                open={isGenerateOpen}
                onOpenChange={setIsGenerateOpen}
                clientId={clientId}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the report <strong>{reportToDelete?.title}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {deleteMutation.isLoading ? "Deleting..." : "Delete Report"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
