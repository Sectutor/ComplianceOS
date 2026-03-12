/**
 * NIS2 Incident Reporting Page
 * 
 * Tracks significant incidents and NIS2 reporting deadlines
 * Article 23 requires: 24h early warning, 72h incident notification, 1 month final report
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { AlertTriangle, ArrowLeft, Clock, Bell, FileText, CheckCircle, XCircle, Plus, Activity, Shield } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@complianceos/ui/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@complianceos/ui/ui/dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// NIS2 Reporting Timeline Requirements
const REPORTING_TIMELINE = [
    {
        stage: 'early_warning',
        deadline: '24 hours',
        title: 'Early Warning',
        description: 'Notify competent authority of significant incident',
        requirement: 'Article 23(1)'
    },
    {
        stage: 'incident_notification',
        deadline: '72 hours',
        title: 'Incident Notification',
        description: 'Provide initial assessment including severity and impact',
        requirement: 'Article 23(2)'
    },
    {
        stage: 'final_report',
        deadline: '1 month',
        title: 'Final Report',
        description: 'Submit detailed final report with lessons learned',
        requirement: 'Article 23(3)'
    },
];

// Sample incidents data structure
interface IncidentReport {
    id: number;
    title: string;
    dateOccurred: Date;
    status: 'detected' | 'early_warning_sent' | 'notification_sent' | 'final_report_sent' | 'closed';
    severity: 'low' | 'medium' | 'high' | 'critical';
    isSignificant: boolean;
    crossBorderImpact: boolean;
    sectorsAffected: string[];
    description: string;
    earlyWarningSent?: Date;
    notificationSent?: Date;
    finalReportSent?: Date;
}

export default function NIS2IncidentReporting() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newIncident, setNewIncident] = useState({
        title: '',
        description: '',
        severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        isSignificant: false,
        crossBorderImpact: false,
        sectorsAffected: [] as string[],
    });

    // Query incidents from trpc
    const { data: incidentsData, isLoading } = trpc.cyber.getIncidents.useQuery(
        { clientId: clientId || 0 },
        { enabled: !!clientId }
    );

    // Sample data for demonstration if no real data
    const sampleIncidents: IncidentReport[] = [
        {
            id: 1,
            title: 'Ransomware attack on production server',
            dateOccurred: new Date('2025-02-15'),
            status: 'final_report_sent',
            severity: 'critical',
            isSignificant: true,
            crossBorderImpact: true,
            sectorsAffected: ['Healthcare', 'Finance'],
            description: 'Ransomware encrypted critical production systems',
            earlyWarningSent: new Date('2025-02-15'),
            notificationSent: new Date('2025-02-16'),
            finalReportSent: new Date('2025-03-15'),
        },
        {
            id: 2,
            title: 'DDoS attack on web services',
            dateOccurred: new Date('2025-03-01'),
            status: 'notification_sent',
            severity: 'high',
            isSignificant: true,
            crossBorderImpact: false,
            sectorsAffected: ['Digital Infrastructure'],
            description: 'Distributed denial of service attack lasting 4 hours',
            earlyWarningSent: new Date('2025-03-01'),
            notificationSent: new Date('2025-03-02'),
        },
        {
            id: 3,
            title: 'Phishing campaign targeting employees',
            dateOccurred: new Date('2025-03-10'),
            status: 'detected',
            severity: 'medium',
            isSignificant: false,
            crossBorderImpact: false,
            sectorsAffected: [],
            description: 'Targeted phishing emails detected, no credentials compromised',
        },
    ];

    const incidents = incidentsData?.length ? incidentsData as IncidentReport[] : sampleIncidents;

    // Calculate metrics
    const significantIncidents = incidents.filter((i: IncidentReport) => i.isSignificant);
    const pendingReports = significantIncidents.filter((i: IncidentReport) =>
        i.status !== 'final_report_sent' && i.status !== 'closed'
    );
    const completedReports = significantIncidents.filter((i: IncidentReport) =>
        i.status === 'final_report_sent' || i.status === 'closed'
    );

    // Calculate deadline status
    const getDeadlineStatus = (incident: IncidentReport) => {
        if (!incident.isSignificant || incident.status === 'final_report_sent') return 'completed';

        const now = new Date();
        const occurred = new Date(incident.dateOccurred);

        // Early warning: 24 hours from occurrence
        const earlyWarningDeadline = new Date(occurred.getTime() + 24 * 60 * 60 * 1000);
        if (!incident.earlyWarningSent && now > earlyWarningDeadline) return 'overdue';

        // Notification: 72 hours from occurrence
        const notificationDeadline = new Date(occurred.getTime() + 72 * 60 * 60 * 1000);
        if (!incident.notificationSent && now > notificationDeadline) return 'overdue';

        // Final report: 1 month from occurrence
        const finalReportDeadline = new Date(occurred.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (!incident.finalReportSent && now > finalReportDeadline) return 'overdue';

        if (!incident.earlyWarningSent) return 'early_warning';
        if (!incident.notificationSent) return 'notification';
        if (!incident.finalReportSent) return 'final_report';

        return 'completed';
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'medium': return 'bg-amber-100 text-amber-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'detected': return <Badge variant="outline">Detected</Badge>;
            case 'early_warning_sent': return <Badge className="bg-blue-100 text-blue-800">Early Warning Sent</Badge>;
            case 'notification_sent': return <Badge className="bg-purple-100 text-purple-800">72h Notification</Badge>;
            case 'final_report_sent': return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
            case 'closed': return <Badge className="bg-slate-100 text-slate-800">Closed</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleCreateIncident = () => {
        toast.success('Incident reported successfully!');
        setIsDialogOpen(false);
        setNewIncident({
            title: '',
            description: '',
            severity: 'medium',
            isSignificant: false,
            crossBorderImpact: false,
            sectorsAffected: [],
        });
    };

    if (isLoading) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="container mx-auto py-8">
                    <div className="flex items-center justify-center h-64">
                        <Activity className="h-12 w-12 text-purple-500 animate-pulse" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

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
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                        <Bell className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Incident Reporting</h1>
                        <p className="text-muted-foreground">
                            Article 23 - NIS2 incident notification requirements
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-orange-50 text-orange-700 border-orange-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Article 23
                    </Badge>
                </div>

                {/* NIS2 Requirements Alert */}
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="text-orange-800 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            NIS2 Article 23 Reporting Requirements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {REPORTING_TIMELINE.map((timeline) => (
                                <div key={timeline.stage} className="bg-white rounded-lg p-4 border border-orange-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="h-4 w-4 text-orange-600" />
                                        <span className="font-semibold text-orange-800">{timeline.title}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-orange-600 mb-1">{timeline.deadline}</p>
                                    <p className="text-sm text-orange-700">{timeline.description}</p>
                                    <p className="text-xs text-orange-500 mt-2">{timeline.requirement}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Incidents</CardDescription>
                            <CardTitle className="text-3xl">{incidents.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">All recorded incidents</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Significant (NIS2)</CardDescription>
                            <CardTitle className="text-3xl text-orange-600">{significantIncidents.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Require reporting</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Pending Reports</CardDescription>
                            <CardTitle className="text-3xl text-amber-600">{pendingReports.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Deadline approaching</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Completed</CardDescription>
                            <CardTitle className="text-3xl text-green-600">{completedReports.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Final reports sent</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Incidents Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Incident Reports</CardTitle>
                            <CardDescription>Track and manage NIS2 reportable incidents</CardDescription>
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-orange-600 hover:bg-orange-700">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Report Incident
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Report New Incident</DialogTitle>
                                    <DialogDescription>
                                        Document a new security incident for NIS2 compliance tracking.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Incident Title</Label>
                                        <Input
                                            id="title"
                                            value={newIncident.title}
                                            onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                                            placeholder="Brief description of the incident"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={newIncident.description}
                                            onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                                            placeholder="Detailed description of what happened"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Severity</Label>
                                        <Select
                                            value={newIncident.severity}
                                            onValueChange={(v: any) => setNewIncident({ ...newIncident, severity: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="significant"
                                            checked={newIncident.isSignificant}
                                            onChange={(e) => setNewIncident({ ...newIncident, isSignificant: e.target.checked })}
                                            className="rounded"
                                        />
                                        <Label htmlFor="significant" className="font-normal">
                                            This is a significant incident (NIS2 reportable)
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="crossBorder"
                                            checked={newIncident.crossBorderImpact}
                                            onChange={(e) => setNewIncident({ ...newIncident, crossBorderImpact: e.target.checked })}
                                            className="rounded"
                                        />
                                        <Label htmlFor="crossBorder" className="font-normal">
                                            Cross-border impact
                                        </Label>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleCreateIncident}>Report Incident</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Incident</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Deadline Status</TableHead>
                                    <TableHead>NIS2</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incidents.map((incident: any) => {
                                    const deadlineStatus = getDeadlineStatus(incident);
                                    return (
                                        <TableRow key={incident.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{incident.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {incident.description}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(incident.dateOccurred).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(incident.severity)}`}>
                                                    {incident.severity}
                                                </span>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(incident.status)}</TableCell>
                                            <TableCell>
                                                {incident.isSignificant ? (
                                                    deadlineStatus === 'overdue' ? (
                                                        <Badge className="bg-red-100 text-red-800">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Overdue
                                                        </Badge>
                                                    ) : deadlineStatus === 'completed' ? (
                                                        <Badge className="bg-green-100 text-green-800">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Complete
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-100 text-amber-800">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            {deadlineStatus === 'early_warning' ? '24h' :
                                                                deadlineStatus === 'notification' ? '72h' : '1mo'} pending
                                                        </Badge>
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {incident.isSignificant && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {incident.crossBorderImpact ? 'Cross-border' : 'National'}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
