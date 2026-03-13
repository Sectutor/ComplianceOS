/**
 * NIS2 Incident Reporting Page
 * 
 * Tracks significant incidents and NIS2 reporting deadlines with KANBAN board
 * Article 23 requires: 24h early warning, 72h incident notification, 1 month final report
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import {
    AlertTriangle,
    ArrowLeft,
    Clock,
    Bell,
    FileText,
    CheckCircle,
    XCircle,
    Plus,
    Activity,
    Shield,
    AlertCircle as AlertCircleIcon,
    Send,
    Eye,
    Globe,
    GripVertical
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
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
import { toast } from 'sonner';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

// NIS2 Reporting Timeline Requirements
const REPORTING_TIMELINE = [
    {
        stage: 'early_warning',
        deadline: '24 hours',
        title: 'Early Warning',
        description: 'Notify competent authority of significant incident',
        requirement: 'Article 23(1)',
        color: 'red'
    },
    {
        stage: 'incident_notification',
        deadline: '72 hours',
        title: 'Incident Notification',
        description: 'Provide initial assessment including severity and impact',
        requirement: 'Article 23(2)',
        color: 'amber'
    },
    {
        stage: 'final_report',
        deadline: '1 month',
        title: 'Final Report',
        description: 'Submit detailed final report with lessons learned',
        requirement: 'Article 23(3)',
        color: 'green'
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

// Column definition
interface KanbanColumn {
    id: string;
    title: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    description: string;
}

const COLUMNS: KanbanColumn[] = [
    {
        id: '24h',
        title: '24h Early Warning',
        color: 'red-800',
        bgColor: 'red-50',
        borderColor: 'red-200',
        icon: <AlertCircleIcon className="h-5 w-5 text-red-600" />,
        description: 'Incidents requiring immediate notification'
    },
    {
        id: '72h',
        title: '72h Notification',
        color: 'amber-800',
        bgColor: 'amber-50',
        borderColor: 'amber-200',
        icon: <Clock className="h-5 w-5 text-amber-600" />,
        description: 'Incidents requiring full notification'
    },
    {
        id: '1month',
        title: '1 Month Final Report',
        color: 'blue-800',
        bgColor: 'blue-50',
        borderColor: 'blue-200',
        icon: <FileText className="h-5 w-5 text-blue-600" />,
        description: 'Incidents requiring final report'
    },
];

// Sortable Card Component
function SortableKanbanCard({
    incident,
    onSendWarning,
    onSendNotification,
    onSendFinal
}: {
    incident: IncidentReport;
    onSendWarning: () => void;
    onSendNotification: () => void;
    onSendFinal: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `incident-${incident.id}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const now = new Date();
    const occurred = new Date(incident.dateOccurred);
    const hoursSinceOccurrence = (now.getTime() - occurred.getTime()) / (1000 * 60 * 60);

    const getDeadlineInfo = () => {
        if (!incident.isSignificant) return null;

        if (!incident.earlyWarningSent) {
            const hoursRemaining = 24 - hoursSinceOccurrence;
            return { stage: '24h', hoursRemaining: Math.max(0, hoursRemaining), overdue: hoursRemaining < 0 };
        }
        if (!incident.notificationSent) {
            const hoursRemaining = 72 - hoursSinceOccurrence;
            return { stage: '72h', hoursRemaining: Math.max(0, hoursRemaining), overdue: hoursRemaining < 0 };
        }
        if (!incident.finalReportSent) {
            const daysRemaining = 30 - (hoursSinceOccurrence / 24);
            return { stage: '1month', hoursRemaining: daysRemaining * 24, overdue: daysRemaining < 0 };
        }
        return null;
    };

    const deadlineInfo = getDeadlineInfo();

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className="mb-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                        >
                            <GripVertical className="h-4 w-4" />
                        </button>
                        <Badge className={`${getSeverityColor(incident.severity)} text-xs`}>
                            {incident.severity}
                        </Badge>
                    </div>
                    {incident.crossBorderImpact && (
                        <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Cross-border
                        </Badge>
                    )}
                </div>
                <h4 className="font-medium text-sm mb-1">{incident.title}</h4>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {incident.description}
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(incident.dateOccurred).toLocaleDateString()}
                    </div>
                    {deadlineInfo && (
                        <div className={`text-xs font-medium ${deadlineInfo.overdue ? 'text-red-600' :
                            deadlineInfo.hoursRemaining < 6 ? 'text-orange-600' : 'text-muted-foreground'
                            }`}>
                            {deadlineInfo.overdue ? (
                                <span className="flex items-center">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Overdue
                                </span>
                            ) : deadlineInfo.stage === '1month' ? (
                                `${Math.round(deadlineInfo.hoursRemaining / 24)} days left`
                            ) : (
                                `${Math.round(deadlineInfo.hoursRemaining)}h left`
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-2 mt-3">
                    {incident.status === 'detected' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSendWarning();
                            }}
                        >
                            <Send className="h-3 w-3 mr-1" />
                            Send 24h
                        </Button>
                    )}
                    {incident.status === 'early_warning_sent' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSendNotification();
                            }}
                        >
                            <Send className="h-3 w-3 mr-1" />
                            Send 72h
                        </Button>
                    )}
                    {incident.status === 'notification_sent' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSendFinal();
                            }}
                        >
                            <Send className="h-3 w-3 mr-1" />
                            Send Final
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Drag Overlay Card (shown while dragging)
function DragOverlayCard({ incident }: { incident: IncidentReport }) {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <Card className="mb-3 shadow-lg opacity-90 rotate-2">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <Badge className={`${getSeverityColor(incident.severity)} text-xs`}>
                        {incident.severity}
                    </Badge>
                    {incident.crossBorderImpact && (
                        <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Cross-border
                        </Badge>
                    )}
                </div>
                <h4 className="font-medium text-sm mb-1">{incident.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {incident.description}
                </p>
            </CardContent>
        </Card>
    );
}

export default function NIS2IncidentReporting() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showSignificantOnly, setShowSignificantOnly] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [newIncident, setNewIncident] = useState({
        title: '',
        description: '',
        severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        isSignificant: true,
        crossBorderImpact: false,
        sectorsAffected: [] as string[],
    });

    // Sample incidents with more realistic data
    const [incidents, setIncidents] = useState<IncidentReport[]>([
        {
            id: 1,
            title: 'Ransomware attack on production server',
            dateOccurred: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            status: 'notification_sent',
            severity: 'critical',
            isSignificant: true,
            crossBorderImpact: true,
            sectorsAffected: ['Healthcare', 'Finance'],
            description: 'Ransomware encrypted critical production systems',
            earlyWarningSent: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notificationSent: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
            id: 2,
            title: 'DDoS attack on web services',
            dateOccurred: new Date(Date.now() - 12 * 60 * 60 * 1000),
            status: 'early_warning_sent',
            severity: 'high',
            isSignificant: true,
            crossBorderImpact: false,
            sectorsAffected: ['Digital Infrastructure'],
            description: 'Distributed denial of service attack lasting 4 hours',
            earlyWarningSent: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
        {
            id: 3,
            title: 'Phishing campaign targeting employees',
            dateOccurred: new Date(Date.now() - 6 * 60 * 60 * 1000),
            status: 'detected',
            severity: 'medium',
            isSignificant: true,
            crossBorderImpact: false,
            sectorsAffected: [],
            description: 'Targeted phishing emails detected, no credentials compromised',
        },
        {
            id: 4,
            title: 'SQL Injection discovered in legacy app',
            dateOccurred: new Date(Date.now() - 20 * 60 * 60 * 1000),
            status: 'detected',
            severity: 'high',
            isSignificant: true,
            crossBorderImpact: true,
            sectorsAffected: ['Digital Infrastructure'],
            description: 'SQL injection vulnerability found in production API',
        },
        {
            id: 5,
            title: 'Unauthorized access attempt',
            dateOccurred: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            status: 'final_report_sent',
            severity: 'medium',
            isSignificant: true,
            crossBorderImpact: false,
            sectorsAffected: [],
            description: 'Unauthorized access attempt detected and blocked',
            earlyWarningSent: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            notificationSent: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            finalReportSent: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
    ]);

    // Filter incidents
    const filteredIncidents = showSignificantOnly
        ? incidents.filter((i: IncidentReport) => i.isSignificant)
        : incidents;

    // Get incidents by column
    const getIncidentsByColumn = (columnId: string) => {
        return filteredIncidents.filter((incident: IncidentReport) => {
            const now = new Date();
            const occurred = new Date(incident.dateOccurred);
            const hoursSinceOccurrence = (now.getTime() - occurred.getTime()) / (1000 * 60 * 60);

            switch (columnId) {
                case '24h':
                    if (incident.status === 'detected') {
                        return hoursSinceOccurrence <= 24;
                    }
                    return false;
                case '72h':
                    if (incident.status === 'early_warning_sent' || incident.status === 'detected') {
                        return hoursSinceOccurrence > 24 && hoursSinceOccurrence <= 72;
                    }
                    return false;
                case '1month':
                    if (incident.status === 'notification_sent' || incident.status === 'early_warning_sent') {
                        return hoursSinceOccurrence > 72;
                    }
                    return false;
                default:
                    return false;
            }
        });
    };

    const incidents24h = getIncidentsByColumn('24h');
    const incidents72h = getIncidentsByColumn('72h');
    const incidents1Month = getIncidentsByColumn('1month');
    const completedReports = filteredIncidents.filter((i: IncidentReport) =>
        i.status === 'final_report_sent' || i.status === 'closed'
    );

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeIncidentId = active.id as string;
        const overContainerId = over.id as string;

        // Check if dropped on a column
        if (COLUMNS.some(col => col.id === overContainerId)) {
            const incident = incidents.find(i => `incident-${i.id}` === activeIncidentId);
            if (!incident) return;

            // Determine new status based on column
            let newStatus: IncidentReport['status'] = incident.status;
            if (overContainerId === '24h' && incident.status === 'detected') {
                // Already in detected state, can be moved to 24h column
            } else if (overContainerId === '72h') {
                newStatus = 'early_warning_sent';
            } else if (overContainerId === '1month') {
                newStatus = 'notification_sent';
            }

            // Update incident status
            setIncidents(prev => prev.map(i => {
                if (i.id === incident.id) {
                    const updated = { ...i, status: newStatus };
                    if (newStatus === 'early_warning_sent' && !updated.earlyWarningSent) {
                        updated.earlyWarningSent = new Date();
                    } else if (newStatus === 'notification_sent' && !updated.notificationSent) {
                        updated.notificationSent = new Date();
                    }
                    return updated;
                }
                return i;
            }));

            toast.success(`Incident moved to ${COLUMNS.find(c => c.id === overContainerId)?.title}`);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Handle drag over for visual feedback
    };

    const handleSendEarlyWarning = (incidentId: number) => {
        setIncidents(prev => prev.map(i => {
            if (i.id === incidentId) {
                return {
                    ...i,
                    status: 'early_warning_sent' as const,
                    earlyWarningSent: new Date()
                };
            }
            return i;
        }));
        toast.success('Early warning sent to competent authority');
    };

    const handleSendNotification = (incidentId: number) => {
        setIncidents(prev => prev.map(i => {
            if (i.id === incidentId) {
                return {
                    ...i,
                    status: 'notification_sent' as const,
                    notificationSent: new Date()
                };
            }
            return i;
        }));
        toast.success('72-hour notification sent');
    };

    const handleSendFinalReport = (incidentId: number) => {
        setIncidents(prev => prev.map(i => {
            if (i.id === incidentId) {
                return {
                    ...i,
                    status: 'final_report_sent' as const,
                    finalReportSent: new Date()
                };
            }
            return i;
        }));
        toast.success('Final report submitted');
    };

    const getActiveIncident = () => {
        if (!activeId) return null;
        const id = activeId.replace('incident-', '');
        return incidents.find(i => i.id === parseInt(id));
    };

    return (
        <DashboardLayout fullWidth={true}>
            <div className="container mx-auto py-8 space-y-6">
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
                            Article 23 - NIS2 significant incident tracking
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-orange-50 text-orange-700 border-orange-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Article 23
                    </Badge>
                </div>

                {/* NIS2 Requirements Alert */}
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="py-4">
                        <CardTitle className="text-orange-800 flex items-center gap-2 text-lg">
                            <AlertTriangle className="h-5 w-5" />
                            NIS2 Article 23 Reporting Deadlines
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="grid gap-4 md:grid-cols-3">
                            {REPORTING_TIMELINE.map((timeline) => (
                                <div key={timeline.stage} className="bg-white rounded-lg p-4 border border-orange-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className={`h-4 w-4 text-${timeline.color}-600`} />
                                        <span className="font-semibold text-orange-800">{timeline.title}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-orange-600 mb-1">{timeline.deadline}</p>
                                    <p className="text-sm text-orange-700">{timeline.description}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics Summary */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className={incidents24h.length > 0 ? "border-red-200 bg-red-50" : ""}>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <AlertCircleIcon className="h-4 w-4 text-red-600" />
                                24h Pending
                            </CardDescription>
                            <CardTitle className="text-3xl text-red-600">{incidents24h.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Early warning required</p>
                        </CardContent>
                    </Card>
                    <Card className={incidents72h.length > 0 ? "border-amber-200 bg-amber-50" : ""}>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-600" />
                                72h Pending
                            </CardDescription>
                            <CardTitle className="text-3xl text-amber-600">{incidents72h.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Notification pending</p>
                        </CardContent>
                    </Card>
                    <Card className={incidents1Month.length > 0 ? "border-blue-200 bg-blue-50" : ""}>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                1 Month Pending
                            </CardDescription>
                            <CardTitle className="text-3xl text-blue-600">{incidents1Month.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Final report due</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Completed
                            </CardDescription>
                            <CardTitle className="text-3xl text-green-600">{completedReports.length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">All reports sent</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="kanban" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="kanban">
                                <Activity className="h-4 w-4 mr-2" />
                                Kanban Board
                            </TabsTrigger>
                            <TabsTrigger value="list">
                                <FileText className="h-4 w-4 mr-2" />
                                Incident List
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showSignificantOnly}
                                    onChange={(e) => setShowSignificantOnly(e.target.checked)}
                                    className="rounded"
                                />
                                <span className={showSignificantOnly ? "font-medium" : "text-muted-foreground"}>
                                    Significant incidents only
                                </span>
                            </label>
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-orange-600 hover:bg-orange-700">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Report Incident
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Report New Significant Incident</DialogTitle>
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
                                        <Button onClick={() => {
                                            toast.success('Incident reported successfully!');
                                            setIsDialogOpen(false);
                                        }}>Report Incident</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Kanban Board View */}
                    <TabsContent value="kanban" className="mt-0">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                        >
                            <div className="grid gap-4 md:grid-cols-3">
                                {COLUMNS.map((column) => {
                                    const columnIncidents = getIncidentsByColumn(column.id);
                                    const { setNodeRef, isOver } = useDroppable({ id: column.id });

                                    // Get static classes based on column
                                    const getColumnClasses = (colId: string) => {
                                        switch (colId) {
                                            case '24h': return 'bg-red-50 border-red-200';
                                            case '72h': return 'bg-amber-50 border-amber-200';
                                            case '1month': return 'bg-blue-50 border-blue-200';
                                            default: return 'bg-gray-50 border-gray-200';
                                        }
                                    };

                                    const getColumnTextClasses = (colId: string) => {
                                        switch (colId) {
                                            case '24h': return 'text-red-800';
                                            case '72h': return 'text-amber-800';
                                            case '1month': return 'text-blue-800';
                                            default: return 'text-gray-800';
                                        }
                                    };

                                    return (
                                        <div
                                            key={column.id}
                                            ref={setNodeRef}
                                            className={`${getColumnClasses(column.id)} rounded-lg p-4 border-2 ${isOver ? 'border-blue-400 border-dashed' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    {column.icon}
                                                    <h3 className={`font-semibold ${getColumnTextClasses(column.id)}`}>{column.title}</h3>
                                                </div>
                                                <Badge className={`${getColumnClasses(column.id)} ${getColumnTextClasses(column.id)}`}>
                                                    {columnIncidents.length}
                                                </Badge>
                                            </div>
                                            <p className={`text-xs ${getColumnTextClasses(column.id)} mb-4`}>
                                                {column.description}
                                            </p>
                                            <SortableContext
                                                items={columnIncidents.map(i => `incident-${i.id}`)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-2 max-h-[500px] overflow-y-auto min-h-[200px]">
                                                    {columnIncidents.length === 0 ? (
                                                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-lg">
                                                            <p className="text-sm">Drop incidents here</p>
                                                        </div>
                                                    ) : (
                                                        columnIncidents.map((incident: IncidentReport) => (
                                                            <SortableKanbanCard
                                                                key={incident.id}
                                                                incident={incident}
                                                                onSendWarning={() => handleSendEarlyWarning(incident.id)}
                                                                onSendNotification={() => handleSendNotification(incident.id)}
                                                                onSendFinal={() => handleSendFinalReport(incident.id)}
                                                            />
                                                        ))
                                                    )}
                                                </div>
                                            </SortableContext>
                                        </div>
                                    );
                                })}
                            </div>
                            <DragOverlay>
                                {activeId ? (
                                    <DragOverlayCard incident={getActiveIncident()!} />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </TabsContent>

                    {/* List View */}
                    <TabsContent value="list" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>All Significant Incidents</CardTitle>
                                <CardDescription>
                                    {showSignificantOnly
                                        ? 'Showing NIS2 reportable incidents only'
                                        : 'Showing all incidents including non-significant'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4 font-medium">Incident</th>
                                                <th className="text-left py-3 px-4 font-medium">Date</th>
                                                <th className="text-left py-3 px-4 font-medium">Severity</th>
                                                <th className="text-left py-3 px-4 font-medium">Status</th>
                                                <th className="text-left py-3 px-4 font-medium">Deadline</th>
                                                <th className="text-left py-3 px-4 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredIncidents.map((incident: IncidentReport) => {
                                                const now = new Date();
                                                const occurred = new Date(incident.dateOccurred);
                                                const hoursSinceOccurrence = (now.getTime() - occurred.getTime()) / (1000 * 60 * 60);

                                                const getDeadlineInfo = () => {
                                                    if (!incident.isSignificant) return null;
                                                    if (!incident.earlyWarningSent) {
                                                        const hoursRemaining = 24 - hoursSinceOccurrence;
                                                        return { overdue: hoursRemaining < 0, stage: '24h', remaining: hoursRemaining };
                                                    }
                                                    if (!incident.notificationSent) {
                                                        const hoursRemaining = 72 - hoursSinceOccurrence;
                                                        return { overdue: hoursRemaining < 0, stage: '72h', remaining: hoursRemaining };
                                                    }
                                                    if (!incident.finalReportSent) {
                                                        const daysRemaining = 30 - (hoursSinceOccurrence / 24);
                                                        return { overdue: daysRemaining < 0, stage: '1month', remaining: daysRemaining * 24 };
                                                    }
                                                    return null;
                                                };
                                                const deadlineInfo = getDeadlineInfo();

                                                const getSeverityColor = (severity: string) => {
                                                    switch (severity) {
                                                        case 'critical': return 'bg-red-100 text-red-800';
                                                        case 'high': return 'bg-orange-100 text-orange-800';
                                                        case 'medium': return 'bg-amber-100 text-amber-800';
                                                        default: return 'bg-slate-100 text-slate-800';
                                                    }
                                                };

                                                return (
                                                    <tr key={incident.id} className="border-b hover:bg-muted/50">
                                                        <td className="py-3 px-4">
                                                            <div>
                                                                <p className="font-medium">{incident.title}</p>
                                                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                    {incident.description}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm">
                                                            {new Date(incident.dateOccurred).toLocaleDateString()}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(incident.severity)}`}>
                                                                {incident.severity}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {incident.status === 'detected' && <Badge variant="outline">Detected</Badge>}
                                                            {incident.status === 'early_warning_sent' && <Badge className="bg-blue-100 text-blue-800">Early Warning</Badge>}
                                                            {incident.status === 'notification_sent' && <Badge className="bg-purple-100 text-purple-800">72h Notified</Badge>}
                                                            {incident.status === 'final_report_sent' && <Badge className="bg-green-100 text-green-800">Completed</Badge>}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {incident.isSignificant && deadlineInfo ? (
                                                                deadlineInfo.overdue ? (
                                                                    <Badge className="bg-red-100 text-red-800">
                                                                        <XCircle className="h-3 w-3 mr-1" />
                                                                        Overdue
                                                                    </Badge>
                                                                ) : deadlineInfo.stage === '1month' ? (
                                                                    <Badge className="bg-blue-100 text-blue-800">
                                                                        {Math.round(deadlineInfo.remaining / 24)} days left
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="bg-amber-100 text-amber-800">
                                                                        {Math.round(deadlineInfo.remaining)}h left
                                                                    </Badge>
                                                                )
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="ghost">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}

