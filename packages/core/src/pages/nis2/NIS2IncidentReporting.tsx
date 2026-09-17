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
    AlertCircle as AlertCircleIcon,
    Send,
    Eye,
    Globe,
    GripVertical,
    Pencil
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
import { PageGuide } from "@/components/PageGuide";
import { trpc } from '@/lib/trpc';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Column types for the Kanban
type ColumnType = '24h' | '72h' | '1month';

// Incident type - matches backend schema
interface Incident {
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

// Column definitions
const columnTitles: Record<ColumnType, string> = {
    '24h': '24h Early Warning',
    '72h': '72h Notification',
    '1month': '1 Month Final Report'
};

const columnColors: Record<ColumnType, { bg: string; border: string; text: string; icon: JSX.Element }> = {
    '24h': {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: <AlertCircleIcon className="h-5 w-5 text-red-600" />
    },
    '72h': {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        icon: <Clock className="h-5 w-5 text-amber-600" />
    },
    '1month': {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: <FileText className="h-5 w-5 text-blue-600" />
    }
};

// Sortable Card Component
function IncidentCard({
    incident,
    onSendWarning,
    onSendNotification,
    onSendFinal,
    onEdit
}: {
    incident: Incident;
    onSendWarning: () => void;
    onSendNotification: () => void;
    onSendFinal: () => void;
    onEdit?: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: incident.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    // Calculate deadline info for NIS2 compliance
    const now = new Date();
    const occurred = new Date(incident.dateOccurred);
    const hoursSinceOccurrence = (now.getTime() - occurred.getTime()) / (1000 * 60 * 60);

    const getDeadlineInfo = () => {
        if (!incident.isSignificant) return null;

        if (!incident.earlyWarningSent && incident.status === 'detected') {
            const hoursRemaining = 24 - hoursSinceOccurrence;
            return { stage: '24h', hoursRemaining: Math.max(0, hoursRemaining), overdue: hoursRemaining < 0 };
        }
        if (!incident.notificationSent && incident.status === 'early_warning_sent') {
            const hoursRemaining = 72 - hoursSinceOccurrence;
            return { stage: '72h', hoursRemaining: Math.max(0, hoursRemaining), overdue: hoursRemaining < 0 };
        }
        if (!incident.finalReportSent && incident.status === 'notification_sent') {
            const daysRemaining = 30 - (hoursSinceOccurrence / 24);
            return { stage: '1month', hoursRemaining: daysRemaining * 24, overdue: daysRemaining < 0 };
        }
        return null;
    };

    const deadlineInfo = getDeadlineInfo();

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className="mb-3 hover:shadow-md transition-shadow"
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
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
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
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
                                <span>{Math.round(deadlineInfo.hoursRemaining / 24)}d left</span>
                            ) : (
                                <span>{Math.round(deadlineInfo.hoursRemaining)}h left</span>
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

// Drag Overlay Card
function IncidentCardOverlay({ incident }: { incident: Incident }) {
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

// Column Component
function KanbanColumn({
    id,
    title,
    incidents,
    color,
    onSendWarning,
    onSendNotification,
    onSendFinal,
    onEdit
}: {
    id: ColumnType;
    title: string;
    incidents: Incident[];
    color: typeof columnColors['24h'];
    onSendWarning: (id: number) => void;
    onSendNotification: (id: number) => void;
    onSendFinal: (id: number) => void;
    onEdit?: (incident: Incident) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`${color.bg} rounded-lg p-4 border-2 ${isOver ? 'border-blue-500 border-dashed bg-blue-50' : color.border} min-h-[600px] transition-all duration-200`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {color.icon}
                    <h3 className={`font-semibold ${color.text}`}>{title}</h3>
                </div>
                <Badge className={`${color.bg} ${color.text}`}>
                    {incidents.length}
                </Badge>
            </div>
            <p className={`text-xs ${color.text} mb-4`}>
                {id === '24h' && 'Incidents requiring immediate notification'}
                {id === '72h' && 'Incidents requiring full notification'}
                {id === '1month' && 'Incidents requiring final report'}
            </p>
            <SortableContext
                items={incidents.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2 max-h-[800px] overflow-y-auto min-h-[400px]">
                    {incidents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted-foreground/20 rounded-lg">
                            <p className="text-sm">Drop incidents here</p>
                        </div>
                    ) : (
                        incidents.map((incident) => (
                            <IncidentCard
                                key={incident.id}
                                incident={incident}
                                onSendWarning={() => onSendWarning(incident.id)}
                                onSendNotification={() => onSendNotification(incident.id)}
                                onSendFinal={() => onSendFinal(incident.id)}
                                onEdit={onEdit ? () => onEdit(incident) : undefined}
                            />
                        ))
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

export default function NIS2IncidentReporting() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showSignificantOnly, setShowSignificantOnly] = useState(true);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [newIncident, setNewIncident] = useState({
        title: '',
        description: '',
        severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        isSignificant: true,
        crossBorderImpact: false,
        cause: 'unknown',
    });

    // Edit incident state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingIncident, setEditingIncident] = useState<{
        id: number;
        title: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        isSignificant: boolean;
        crossBorderImpact: boolean;
    } | null>(null);

    // Open edit dialog with incident data
    const handleEditIncident = (incident: Incident) => {
        setEditingIncident({
            id: incident.id,
            title: incident.title,
            description: incident.description,
            severity: incident.severity,
            isSignificant: incident.isSignificant,
            crossBorderImpact: incident.crossBorderImpact,
        });
        setIsEditDialogOpen(true);
    };

    // Fetch incidents from server
    const { data: dbIncidents, isLoading, refetch } = trpc.cyber.getIncidents.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Update incident mutation
    const updateMutation = trpc.cyber.updateIncident.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to update: ${err.message}`);
        }
    });

    // Report incident mutation
    const reportMutation = trpc.cyber.reportIncident.useMutation({
        onSuccess: () => {
            toast.success('Incident reported successfully');
            setIsDialogOpen(false);
            setNewIncident({
                title: '',
                description: '',
                severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
                isSignificant: true,
                crossBorderImpact: false,
                cause: 'unknown',
            });
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to report: ${err.message}`);
        }
    });

    // Load sample data if no incidents exist
    const loadSampleData = () => {
        const sampleIncidents = [
            {
                title: 'Ransomware attack on production server',
                description: 'Ransomware encrypted critical production systems',
                severity: 'critical' as const,
                isSignificant: true,
                crossBorderImpact: true,
                cause: 'malware',
                detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                title: 'DDoS attack on web services',
                description: 'Distributed denial of service attack lasting 4 hours',
                severity: 'high' as const,
                isSignificant: true,
                crossBorderImpact: false,
                cause: 'external_attack',
                detectedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            },
            {
                title: 'Phishing campaign targeting employees',
                description: 'Targeted phishing emails detected, no credentials compromised',
                severity: 'medium' as const,
                isSignificant: true,
                crossBorderImpact: false,
                cause: 'phishing',
                detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            },
            {
                title: 'SQL Injection discovered in legacy app',
                description: 'SQL injection vulnerability found in production API',
                severity: 'high' as const,
                isSignificant: true,
                crossBorderImpact: true,
                cause: 'vulnerability',
                detectedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
            },
            {
                title: 'Unauthorized access attempt',
                description: 'Unauthorized access attempt detected and blocked',
                severity: 'medium' as const,
                isSignificant: true,
                crossBorderImpact: false,
                cause: 'unauthorized_access',
                detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            },
        ];

        // Use Promise.all for batch loading
        Promise.all(
            sampleIncidents.map((incident) =>
                reportMutation.mutateAsync({
                    clientId,
                    ...incident,
                })
            )
        ).then(() => {
            toast.success('Sample incidents loaded');
            refetch();
        }).catch((err) => {
            toast.error(`Failed to load sample data: ${err.message}`);
        });
    };

    // Convert DB incidents to local format and group by column
    const incidents: Record<ColumnType, Incident[]> = React.useMemo(() => {
        if (!dbIncidents) {
            return { '24h': [], '72h': [], '1month': [] };
        }

        const mapped: Incident[] = dbIncidents.map((i: any) => ({
            id: i.id,
            title: i.title || 'Untitled Incident',
            dateOccurred: i.detectedAt ? new Date(i.detectedAt) : new Date(),
            status: (i.status === 'reported' ? 'notification_sent' :
                i.status === 'investigating' ? 'early_warning_sent' :
                    i.status === 'open' ? 'detected' : 'detected') as any,
            severity: (i.severity || 'medium') as any,
            isSignificant: i.isSignificant || false,
            crossBorderImpact: i.crossBorderImpact || false,
            sectorsAffected: [],
            description: i.description || '',
            earlyWarningSent: i.earlyWarningSentAt ? new Date(i.earlyWarningSentAt) : undefined,
            notificationSent: i.intermediateReportSentAt ? new Date(i.intermediateReportSentAt) : undefined,
            finalReportSent: i.finalReportSentAt ? new Date(i.finalReportSentAt) : undefined,
        }));

        // Filter significant incidents if toggle is on
        const filtered = showSignificantOnly
            ? mapped.filter(i => i.isSignificant)
            : mapped;

        // Group by column based on status
        return {
            '24h': filtered.filter(i => i.status === 'detected'),
            '72h': filtered.filter(i => i.status === 'early_warning_sent'),
            '1month': filtered.filter(i => i.status === 'notification_sent' || i.status === 'final_report_sent')
        };
    }, [dbIncidents, showSignificantOnly]);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Find which column an item belongs to
    const findContainer = (id: string | number): ColumnType | undefined => {
        if (id in incidents) return id as ColumnType;
        return (Object.keys(incidents) as ColumnType[]).find((key) =>
            incidents[key].find((item) => item.id === id)
        );
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;
        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id as number);
        const overContainer = findContainer(overId as number);

        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        // We don't update state during drag over - we handle it in dragEnd
        // to avoid too many re-renders
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId) {
            setActiveId(null);
            return;
        }

        const activeContainer = findContainer(active.id as number);
        const overContainer = findContainer(overId as number);

        if (activeContainer && overContainer) {
            const incidentId = active.id as number;

            // Determine new status based on target column
            let newStatus: string = 'open';
            if (overContainer === '72h') newStatus = 'investigating';
            else if (overContainer === '1month') newStatus = 'reported';

            // Update on server
            updateMutation.mutate({
                clientId,
                incidentId,
                status: newStatus as any,
            });

            // Optimistic update for 72h notification
            if (overContainer === '72h') {
                updateMutation.mutate({
                    clientId,
                    incidentId,
                    earlyWarningSentAt: new Date().toISOString()
                });
            }

            // Optimistic update for 1 month notification
            if (overContainer === '1month') {
                updateMutation.mutate({
                    clientId,
                    incidentId,
                    intermediateReportSentAt: new Date().toISOString()
                });
            }

            toast.success(`Incident moved to ${columnTitles[overContainer]}`);
        }

        setActiveId(null);
    };

    const handleSendEarlyWarning = (incidentId: number) => {
        updateMutation.mutate({
            clientId,
            incidentId,
            status: 'investigating',
            earlyWarningSentAt: new Date().toISOString()
        });
        toast.success('Early warning sent to competent authority');
    };

    const handleSendNotification = (incidentId: number) => {
        updateMutation.mutate({
            clientId,
            incidentId,
            status: 'reported',
            intermediateReportSentAt: new Date().toISOString()
        });
        toast.success('72-hour notification sent');
    };

    const handleSendFinalReport = (incidentId: number) => {
        updateMutation.mutate({
            clientId,
            incidentId,
            status: 'reported',
            finalReportSentAt: new Date().toISOString()
        });
        toast.success('Final report submitted');
    };

    const getActiveIncident = (): Incident | null => {
        if (!activeId) return null;
        for (const col of Object.values(incidents)) {
            const found = col.find(i => i.id === activeId);
            if (found) return found;
        }
        return null;
    };

    // Calculate metrics
    const totalIncidents = Object.values(incidents).reduce((sum, arr) => sum + arr.length, 0);

    const handleReportSubmit = () => {
        if (!newIncident.title || !newIncident.description) {
            toast.error('Please fill in required fields');
            return;
        }

        reportMutation.mutate({
            clientId,
            title: newIncident.title,
            description: newIncident.description,
            severity: newIncident.severity,
            isSignificant: newIncident.isSignificant,
            crossBorderImpact: newIncident.crossBorderImpact,
            detectedAt: new Date().toISOString(),
            cause: 'unknown'
        });
    };

    if (isLoading) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <Activity className="h-10 w-10 text-primary animate-pulse mx-auto" />
                        <p className="text-muted-foreground">Loading incidents...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout fullWidth={true}>
            <div className="mx-auto py-8 space-y-6 max-w-7xl px-4 sm:px-6 lg:px-8">
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

                {/* Page Guide */}
                <PageGuide
                    title="NIS2 Incident Reporting"
                    description="Track and manage significant security incidents per NIS2 Article 23 requirements."
                    rationale="Article 23 requires entities to notify the CSIRT or competent authority of significant incidents without undue delay. The incident reporting timeline is: 24h for early warning, 72h for notification, and 1 month for final report."
                    moduleId="nis2-incident-reporting"
                    isTrainingRequirement={true}
                    howToUse={[
                        { step: "Load Sample Data", description: "Click 'Load Sample Data' to add sample incidents for demonstration." },
                        { step: "View Incidents", description: "Switch between Kanban Board and Table View to see incidents." },
                        { step: "Send Reports", description: "Use the action buttons on each card to send 24h/72h/final notifications." },
                        { step: "Drag & Drop", description: "Drag incidents between columns to update their status." }
                    ]}
                    scenarios={[
                        {
                            title: "Ransomware Attack",
                            example: "A ransomware attack encrypts critical production servers. This is a significant incident requiring immediate reporting.",
                            auditTip: "Document the initial detection time, systems affected, and any cross-border impact."
                        },
                        {
                            title: "DDoS Attack",
                            example: "Distributed denial of service attack disrupts web services for several hours.",
                            auditTip: "Record the duration, services impacted, and mitigation measures taken."
                        },
                        {
                            title: "Data Breach",
                            example: "Unauthorized access results in potential exfiltration of customer data.",
                            auditTip: "Include number of affected users, data types compromised, and notification to data subjects."
                        }
                    ]}
                    resources={[
                        { name: "NIS2 Directive (EU) 2022/2555", description: "Official EU NIS2 Directive text", href: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555" },
                        { name: "Article 23 Guidance", description: "ENISA guidance on incident notification", href: "https://www.enisa.europa.eu/publications/enisa-nis2-guidance" },
                        { name: "Incident Response Plan Template", description: "Template for establishing incident response procedures", href: "/policy-templates/nis2-incident-handling" }
                    ]}
                    integrations={[
                        { name: "SIEM Integration", description: "Connect your SIEM to automatically create incidents from security alerts" },
                        { name: "SOAR Platform", description: "Automate incident triage and notification workflows" },
                        { name: "Email Notifications", description: "Configure automatic notifications to competent authorities" }
                    ]}
                />

                {/* NIS2 Article 23 Process Explanation */}
                <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <FileText className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-orange-800 mb-2">NIS2 Article 23 - Incident Reporting Timeline</h3>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="bg-white/60 p-3 rounded-lg border border-red-200">
                                        <div className="font-medium text-red-700 flex items-center gap-1">
                                            <AlertCircleIcon className="h-4 w-4" />
                                            24 Hours
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Early warning to competent authority
                                        </p>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-lg border border-amber-200">
                                        <div className="font-medium text-amber-700 flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            72 Hours
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Full incident notification
                                        </p>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-lg border border-blue-200">
                                        <div className="font-medium text-blue-700 flex items-center gap-1">
                                            <FileText className="h-4 w-4" />
                                            1 Month
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Final report with root cause
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics Summary */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className={incidents['24h'].length > 0 ? "border-red-200 bg-red-50" : ""}>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <AlertCircleIcon className="h-4 w-4 text-red-600" />
                                24h Pending
                            </CardDescription>
                            <CardTitle className="text-3xl text-red-600">{incidents['24h'].length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Early warning required</p>
                        </CardContent>
                    </Card>
                    <Card className={incidents['72h'].length > 0 ? "border-amber-200 bg-amber-50" : ""}>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-600" />
                                72h Pending
                            </CardDescription>
                            <CardTitle className="text-3xl text-amber-600">{incidents['72h'].length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Notification pending</p>
                        </CardContent>
                    </Card>
                    <Card className={incidents['1month'].length > 0 ? "border-blue-200 bg-blue-50" : ""}>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                1 Month Pending
                            </CardDescription>
                            <CardTitle className="text-3xl text-blue-600">{incidents['1month'].length}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Final report due</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Total
                            </CardDescription>
                            <CardTitle className="text-3xl text-green-600">{totalIncidents}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Active incidents</p>
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
                            <TabsTrigger value="table">
                                <FileText className="h-4 w-4 mr-2" />
                                Table View
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
                                            reportMutation.mutate({
                                                clientId,
                                                ...newIncident,
                                                detectedAt: new Date().toISOString(),
                                            });
                                            toast.success('Incident reported successfully!');
                                            setIsDialogOpen(false);
                                            setNewIncident({
                                                title: '',
                                                description: '',
                                                severity: 'medium',
                                                isSignificant: true,
                                                crossBorderImpact: false,
                                                cause: 'unknown',
                                            });
                                        }}>Report Incident</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Edit Incident Dialog */}
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Edit Incident</DialogTitle>
                                        <DialogDescription>
                                            Update incident details.
                                        </DialogDescription>
                                    </DialogHeader>
                                    {editingIncident && (
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-title">Incident Title</Label>
                                                <Input
                                                    id="edit-title"
                                                    value={editingIncident.title}
                                                    onChange={(e) => setEditingIncident({ ...editingIncident, title: e.target.value })}
                                                    placeholder="Brief description of the incident"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-description">Description</Label>
                                                <Textarea
                                                    id="edit-description"
                                                    value={editingIncident.description}
                                                    onChange={(e) => setEditingIncident({ ...editingIncident, description: e.target.value })}
                                                    placeholder="Detailed description of what happened"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Severity</Label>
                                                <Select
                                                    value={editingIncident.severity}
                                                    onValueChange={(v: any) => setEditingIncident({ ...editingIncident, severity: v })}
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
                                                    id="edit-significant"
                                                    checked={editingIncident.isSignificant}
                                                    onChange={(e) => setEditingIncident({ ...editingIncident, isSignificant: e.target.checked })}
                                                    className="rounded"
                                                />
                                                <Label htmlFor="edit-significant" className="font-normal">
                                                    This is a significant incident (NIS2 reportable)
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="edit-crossBorder"
                                                    checked={editingIncident.crossBorderImpact}
                                                    onChange={(e) => setEditingIncident({ ...editingIncident, crossBorderImpact: e.target.checked })}
                                                    className="rounded"
                                                />
                                                <Label htmlFor="edit-crossBorder" className="font-normal">
                                                    Cross-border impact
                                                </Label>
                                            </div>
                                        </div>
                                    )}
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                        <Button
                                            onClick={() => {
                                                if (editingIncident) {
                                                    updateMutation.mutate({
                                                        clientId,
                                                        incidentId: editingIncident.id,
                                                        title: editingIncident.title,
                                                        description: editingIncident.description,
                                                        severity: editingIncident.severity,
                                                        isSignificant: editingIncident.isSignificant,
                                                        crossBorderImpact: editingIncident.crossBorderImpact,
                                                    }, {
                                                        onSuccess: () => {
                                                            toast.success('Incident updated successfully!');
                                                            setIsEditDialogOpen(false);
                                                            refetch();
                                                        },
                                                        onError: (err: any) => {
                                                            toast.error(`Failed to update: ${err.message}`);
                                                        }
                                                    });
                                                }
                                            }}
                                        >
                                            Save Changes
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button
                                variant="outline"
                                onClick={loadSampleData}
                                disabled={reportMutation.isLoading}
                            >
                                Load Sample Data
                            </Button>
                        </div>
                    </div>

                    {/* Kanban Board */}
                    <TabsContent value="kanban" className="mt-0">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="grid gap-4 md:grid-cols-3">
                                {(Object.keys(incidents) as ColumnType[]).map((columnId) => (
                                    <KanbanColumn
                                        key={columnId}
                                        id={columnId}
                                        title={columnTitles[columnId]}
                                        incidents={incidents[columnId]}
                                        color={columnColors[columnId]}
                                        onSendWarning={handleSendEarlyWarning}
                                        onSendNotification={handleSendNotification}
                                        onSendFinal={handleSendFinalReport}
                                        onEdit={handleEditIncident}
                                    />
                                ))}
                            </div>
                            <DragOverlay>
                                {activeId ? (
                                    <IncidentCardOverlay incident={getActiveIncident()!} />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </TabsContent>

                    {/* Table View */}
                    <TabsContent value="table" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>All Incidents</CardTitle>
                                <CardDescription>List of all NIS2 significant incidents</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Incident</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Detected</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium">Cross-border</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.values(incidents).flat().map((incident) => (
                                                <tr key={incident.id} className="border-t hover:bg-muted/30">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{incident.title}</div>
                                                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                            {incident.description}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge className={`${incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                                            incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                                                incident.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                                                                    'bg-slate-100 text-slate-800'
                                                            }`}>
                                                            {incident.severity}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline">
                                                            {incident.status === 'detected' ? '24h Pending' :
                                                                incident.status === 'early_warning_sent' ? '72h Pending' :
                                                                    incident.status === 'notification_sent' ? '1 Month' : 'Closed'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {new Date(incident.dateOccurred).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {incident.crossBorderImpact ? (
                                                            <Badge variant="secondary">
                                                                <Globe className="h-3 w-3 mr-1" />
                                                                Yes
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div >
        </DashboardLayout >
    );
}


