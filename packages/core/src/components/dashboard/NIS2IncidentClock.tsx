/**
 * NIS2 Incident Reporting Clock Component
 * 
 * Displays countdown timers for mandatory NIS2 incident reporting deadlines:
 * - 24-hour Early Warning (significant incidents)
 * - 72-hour Incident Notification to competent authority
 * - 1-month Final Report
 * 
 * NIS2 Article 23 requires:
 * - Initial notification within 24 hours of becoming aware of a significant incident
 * - Intermediate report within 72 hours
 * - Final report within 1 month
 */

import React, { useState, useEffect } from "react";
import {
    Clock,
    AlertTriangle,
    Shield,
    FileText,
    Bell,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@complianceos/ui/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@complianceos/ui/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";

// Deadline intervals in milliseconds
const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_72 = 72 * 60 * 60 * 1000;
const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

interface IncidentClockProps {
    clientId: number | undefined;
}

interface IncidentDeadline {
    id: number;
    title: string;
    detectedAt: Date;
    type: 'early_warning' | 'notification' | 'final_report';
    status: 'pending' | 'imminent' | 'overdue' | 'completed';
    deadline: Date;
    timeRemaining: number;
    progress: number;
}

export function NIS2IncidentClock({ clientId }: IncidentClockProps) {
    const [, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const effectiveClientId = clientId || selectedClientId;

    // Query for significant incidents via cyber router
    const { data: incidentsData, isLoading, refetch } = trpc.cyber.getIncidents.useQuery(
        { clientId: effectiveClientId || 0 },
        { enabled: !!effectiveClientId }
    );

    // Calculate deadlines for each incident
    const [deadlines, setDeadlines] = useState<IncidentDeadline[]>([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second for live countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Process incidents to calculate deadlines
    useEffect(() => {
        if (incidentsData && incidentsData.length > 0) {
            const newDeadlines: IncidentDeadline[] = [];

            incidentsData.forEach((incident: any) => {
                // Only process significant incidents for NIS2
                if (incident.isSignificant) {
                    const detectedAt = new Date(incident.detectedAt || incident.createdAt);

                    // Early warning deadline (24h)
                    const earlyWarningDeadline = new Date(detectedAt.getTime() + HOURS_24);
                    const timeToEarlyWarning = earlyWarningDeadline.getTime() - currentTime.getTime();

                    // Notification deadline (72h)
                    const notificationDeadline = new Date(detectedAt.getTime() + HOURS_72);
                    const timeToNotification = notificationDeadline.getTime() - currentTime.getTime();

                    // Final report deadline (30 days)
                    const finalReportDeadline = new Date(detectedAt.getTime() + DAYS_30);
                    const timeToFinalReport = finalReportDeadline.getTime() - currentTime.getTime();

                    // Early Warning
                    if (timeToEarlyWarning > 0) {
                        newDeadlines.push({
                            id: incident.id,
                            title: incident.title || 'Significant Incident',
                            detectedAt: detectedAt,
                            type: 'early_warning',
                            status: timeToEarlyWarning < HOURS_24 ? 'imminent' : 'pending',
                            deadline: earlyWarningDeadline,
                            timeRemaining: timeToEarlyWarning,
                            progress: Math.max(0, Math.min(100, ((HOURS_24 - timeToEarlyWarning) / HOURS_24) * 100))
                        });
                    } else if (timeToNotification > 0) {
                        newDeadlines.push({
                            id: incident.id,
                            title: incident.title || 'Significant Incident',
                            detectedAt: detectedAt,
                            type: 'notification',
                            status: timeToNotification < HOURS_24 ? 'imminent' : 'pending',
                            deadline: notificationDeadline,
                            timeRemaining: timeToNotification,
                            progress: Math.max(0, Math.min(100, ((HOURS_72 - timeToNotification) / HOURS_72) * 100))
                        });
                    } else if (timeToFinalReport > 0) {
                        newDeadlines.push({
                            id: incident.id,
                            title: incident.title || 'Significant Incident',
                            detectedAt: detectedAt,
                            type: 'final_report',
                            status: timeToFinalReport < HOURS_24 ? 'imminent' : 'pending',
                            deadline: finalReportDeadline,
                            timeRemaining: timeToFinalReport,
                            progress: Math.max(0, Math.min(100, ((DAYS_30 - timeToFinalReport) / DAYS_30) * 100))
                        });
                    }
                }
            });

            // Sort by time remaining (most urgent first)
            newDeadlines.sort((a, b) => a.timeRemaining - b.timeRemaining);
            setDeadlines(newDeadlines);
        }
    }, [incidentsData, currentTime]);

    // Format time remaining
    const formatTimeRemaining = (ms: number): string => {
        if (ms <= 0) return "OVERDUE";

        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((ms % (60 * 1000)) / 1000);

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    };

    // Get status color
    const getStatusColor = (deadline: IncidentDeadline) => {
        if (deadline.status === 'overdue') return 'text-red-600 bg-red-50 border-red-200';
        if (deadline.status === 'imminent') return 'text-amber-600 bg-amber-50 border-amber-200';
        if (deadline.progress > 75) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        return 'text-blue-600 bg-blue-50 border-blue-200';
    };

    // Get type label
    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'early_warning': return 'Early Warning';
            case 'notification': return '72h Notification';
            case 'final_report': return 'Final Report';
            default: return type;
        }
    };

    // Get type color
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'early_warning': return 'bg-red-500';
            case 'notification': return 'bg-amber-500';
            case 'final_report': return 'bg-blue-500';
            default: return 'bg-slate-500';
        }
    };

    const activeDeadlines = deadlines.filter(d => d.status !== 'completed');
    const overdueCount = activeDeadlines.filter(d => d.timeRemaining <= 0).length;
    const imminentCount = activeDeadlines.filter(d => d.status === 'imminent' && d.timeRemaining > 0).length;

    if (!effectiveClientId) {
        return null;
    }

    return (
        <Card className="border-slate-200/60 shadow-lg shadow-slate-100/50">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-200">
                            <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                NIS2 Incident Clock
                            </CardTitle>
                            <CardDescription className="text-sm">
                                Mandatory reporting deadlines
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {overdueCount > 0 && (
                            <Badge className="bg-red-500 text-white border-0 animate-pulse">
                                {overdueCount} Overdue
                            </Badge>
                        )}
                        {imminentCount > 0 && (
                            <Badge className="bg-amber-500 text-white border-0">
                                {imminentCount} Imminent
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            className="h-8 w-8 p-0"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* NIS2 Requirements Alert */}
                <Alert className="border-blue-200 bg-blue-50/50">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 font-semibold">NIS2 Article 23 Requirements</AlertTitle>
                    <AlertDescription className="text-blue-700 text-xs">
                        Significant incidents must be reported: within 24h (early warning), 72h (notification), and 1 month (final report)
                    </AlertDescription>
                </Alert>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 rounded-lg bg-slate-100 animate-pulse" />
                        ))}
                    </div>
                ) : activeDeadlines.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h4 className="font-semibold text-slate-900">No Active Deadlines</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            No significant incidents requiring NIS2 reporting
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeDeadlines.slice(0, 5).map((deadline) => (
                            <div
                                key={`${deadline.id}-${deadline.type}`}
                                className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${getStatusColor(deadline)}`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${getTypeColor(deadline.type)}`}>
                                            <Clock className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                                                {deadline.title}
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                {getTypeLabel(deadline.type)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs font-bold ${deadline.timeRemaining <= 0
                                            ? 'border-red-500 text-red-600'
                                            : 'border-slate-400'
                                            }`}
                                    >
                                        {formatTimeRemaining(deadline.timeRemaining)}
                                    </Badge>
                                </div>

                                <Progress
                                    value={deadline.progress}
                                    className="h-2 mb-2"
                                    // @ts-ignore - custom colors
                                    accent={
                                        deadline.timeRemaining <= 0
                                            ? 'bg-red-500'
                                            : deadline.status === 'imminent'
                                                ? 'bg-amber-500'
                                                : 'bg-blue-500'
                                    }
                                />

                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        Detected: {deadline.detectedAt.toLocaleDateString()} {deadline.detectedAt.toLocaleTimeString()}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => setLocation(`/clients/${effectiveClientId}/cyber/incidents/${deadline.id}`)}
                                    >
                                        View Incident <ExternalLink className="ml-1 h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {activeDeadlines.length > 5 && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setLocation(`/clients/${effectiveClientId}/cyber/incidents`)}
                            >
                                View All {activeDeadlines.length} Active Deadlines
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default NIS2IncidentClock;
