import { useState, useEffect, useMemo } from "react";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@complianceos/ui/ui/card";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Badge } from "@complianceos/ui/ui/badge";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@complianceos/ui/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { ArrowLeft, Save, Loader2, Clock, CheckCircle2, Send, ShieldAlert, FileText, AlertTriangle, Milestone, BellRing, LifeBuoy, PhoneCall, Copy, ExternalLink, Zap, TrendingUp } from "lucide-react";
import {
    useIncidentClassification,
    useIncidentDeadlines,
    useCsirtTemplate,
    getSeverityMeta,
    getDeadlineMeta,
    getNextDeadlineLabel,
} from "@/pages/incidentClassifierApi";
import {
    useIncidentTimeline,
    useIncidentEscalations,
    getPhaseMeta,
    getEscalationMeta,
    INCIDENT_PHASE_STATUS_LABEL,
    sortEscalations,
    isEscalationOverdue,
    type IncidentTimelineInput,
} from "@/pages/incidentTimelineApi";
import { EU_COUNTRIES } from "@/lib/nis2/competent-authorities";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { PageGuide } from "@/components/PageGuide";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export default function CyberIncidentDetail() {
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();
    const params = useParams<{ incidentId: string }>();
    const incidentId = parseInt(params.incidentId || "0");

    // Form State
    const [title, setTitle] = useState<string>("");
    const [severity, setSeverity] = useState<string>("");
    const [cause, setCause] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [crossBorder, setCrossBorder] = useState<string>("no");
    const [status, setStatus] = useState<string>("open");
    const [affectedAssets, setAffectedAssets] = useState<string>("");
    const [reportedToAuthorities, setReportedToAuthorities] = useState<boolean>(false);
    // NIS2 Classification panel state
    const [templateCountry, setTemplateCountry] = useState<string>("DE");
    const [templateRequested, setTemplateRequested] = useState(false);

    const { data: incident, isLoading, refetch } = trpc.cyber.getIncident.useQuery(
        { clientId: selectedClientId!, incidentId },
        { enabled: !!selectedClientId && !!incidentId }
    );

    const updateMutation = trpc.cyber.updateIncident.useMutation({
        onSuccess: () => {
            toast.success("Incident Updated", {
                description: "The incident report has been saved.",
            });
            refetch();
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to update incident",
            });
        }
    });

    const createRiskMutation = trpc.risks.createRiskAssessment.useMutation({
        onSuccess: () => {
            toast.success("Risk Scenario Created", {
                description: "Post-incident lessons learned added to Risk Register.",
                action: {
                    label: "Open Risk Register",
                    onClick: () => setLocation(`/clients/${selectedClientId}/risks/register`)
                }
            });
        },
        onError: (error) => {
            toast.error("Failed to create risk scenario", {
                description: error.message || "Error creating risk"
            });
        }
    });

    // Load incident data into form
    useEffect(() => {
        if (incident) {
            setTitle(incident.title || "");
            setSeverity(incident.severity || "low");
            setCause(incident.cause || "");
            setDescription(incident.description || "");
            setCrossBorder(incident.crossBorderImpact ? "yes" : "no");
            setStatus(incident.status || "open");
            setAffectedAssets(incident.affectedAssets || "");
            setReportedToAuthorities(incident.reportedToAuthorities || false);
        }
    }, [incident]);

    // NIS2 Art. 23 classification (consumes incidentClassifier.* — UI-STANDARD §16)
    const classificationInput = useMemo(() => {
        if (!incident?.detectedAt) return null;
        return {
            cause: incident.cause ?? undefined,
            affectedUsers: incident.affectedUsersCount ?? 0,
            durationMinutes: incident.serviceDisruptionDuration ?? 0,
            financialLossCents: incident.estimatedFinancialLoss ?? 0,
            criticalInfrastructureAffected: incident.isContinuityTriggered ?? false,
            crossBorderImpact: incident.crossBorderImpact ?? false,
            detectedAt: new Date(incident.detectedAt),
        };
    }, [incident]);

    const {
        data: classification,
        isLoading: classificationLoading,
        isError: classificationError,
    } = useIncidentClassification(classificationInput);

    const {
        data: deadlines,
        isLoading: deadlinesLoading,
        isError: deadlinesError,
    } = useIncidentDeadlines(
        incident?.detectedAt instanceof Date
            ? incident.detectedAt
            : incident?.detectedAt
                ? new Date(incident.detectedAt)
                : null,
    );

    const classificationMeta = classification ? getSeverityMeta(classification.severity) : null;

    const deadlineRows = deadlines
        ? [
            {
                key: "early-warning",
                label: "Early warning",
                window: "Within 24h of detection",
                date: deadlines.earlyWarning ? format(new Date(deadlines.earlyWarning), "MMM d, HH:mm") : "—",
                meta: getDeadlineMeta(deadlines.earlyWarningStatus),
            },
            {
                key: "incident-notification",
                label: "Incident notification",
                window: "Within 72h of detection",
                date: deadlines.incidentNotification ? format(new Date(deadlines.incidentNotification), "MMM d, HH:mm") : "—",
                meta: getDeadlineMeta(deadlines.incidentNotificationStatus),
            },
            {
                key: "final-report",
                label: "Final report",
                window: "Within 1 month of detection",
                date: deadlines.finalReport ? format(new Date(deadlines.finalReport), "MMM d, HH:mm") : "—",
                meta: getDeadlineMeta(deadlines.finalReportStatus),
            },
        ]
        : [];

    const templateInput = useMemo(() => {
        if (!incident || !templateRequested) return null;
        return {
            countryCode: templateCountry,
            incidentTitle: incident.title || "Cyber incident",
            incidentSummary: incident.description ?? undefined,
            severity: incident.severity || "low",
            detectedAt: incident.detectedAt ? new Date(incident.detectedAt) : undefined,
        };
    }, [incident, templateCountry, templateRequested]);

    const {
        data: csirtTemplate,
        isLoading: templateLoading,
        isError: templateError,
    } = useCsirtTemplate(templateInput);

    // NIS2 Art. 23 timeline + escalations (consumes incidentTimeline.* — UI-STANDARD §16)
    const timelineInput = useMemo<IncidentTimelineInput | null>(() => {
        if (!incident?.detectedAt) return null;
        return {
            detectedAt: new Date(incident.detectedAt),
            severity: (incident.severity as IncidentTimelineInput["severity"]) || "low",
            isSignificant: incident.isSignificant ?? classification?.isSignificant ?? false,
            earlyWarningSentAt: incident.earlyWarningSentAt ? new Date(incident.earlyWarningSentAt) : undefined,
            notificationSentAt: incident.intermediateReportSentAt ? new Date(incident.intermediateReportSentAt) : undefined,
            finalReportSentAt: incident.finalReportSentAt ? new Date(incident.finalReportSentAt) : undefined,
            now: new Date(),
        };
    }, [incident, classification]);

    const {
        data: timeline,
        isLoading: timelineLoading,
        isError: timelineError,
    } = useIncidentTimeline(timelineInput);

    const {
        data: escalations,
        isLoading: escalationsLoading,
        isError: escalationsError,
    } = useIncidentEscalations(timelineInput);

    const orderedEscalations = useMemo(
        () => (escalations ? sortEscalations(escalations) : []),
        [escalations]
    );

    const handleSave = () => {
        if (!selectedClientId) return;

        updateMutation.mutate({
            clientId: selectedClientId,
            incidentId,
            title,
            severity: severity as "low" | "medium" | "high" | "critical",
            cause,
            description,
            crossBorderImpact: crossBorder === "yes",
            affectedAssets,
            status: status as "open" | "investigating" | "mitigated" | "resolved" | "reported",
            reportedToAuthorities
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-brand-bright" />
                <p className="text-sm font-bold text-muted-foreground">Loading incident data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-start gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocation(`/clients/${selectedClientId}/cyber/incidents`)}
                        className="mt-1 h-10 w-10 rounded-xl hover:bg-accent shadow-sm ring-1 ring-border/50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <PageGuide
                        title={`Incident Analysis: ID-${incidentId}`}
                        description="Track investigative findings and manage the formal reporting lifecycle."
                        rationale="NIS2 Article 23 requires a detailed report within 72 hours of the early warning."
                        howToUse={[
                            { step: "Status", description: "Keep the incident status updated as the investigation progresses." },
                            { step: "Evidence", description: "Document all affected assets and containment actions." },
                            { step: "Report", description: "Trigger official reporting once findings are solidified." }
                        ]}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (!selectedClientId) return;
                            const likelihood = severity === 'critical' ? 5 : severity === 'high' ? 4 : 3;
                            const impact = severity === 'critical' ? 5 : severity === 'high' ? 4 : 3;
                            createRiskMutation.mutate({
                                clientId: selectedClientId,
                                title: `[Post-Mortem] ${title || 'Cyber Incident #' + incidentId}`,
                                threatDescription: `Root Cause: ${cause || 'Under analysis'}. Details: ${description || 'Documented in incident response.'}`,
                                vulnerabilityDescription: `Affected Assets: ${affectedAssets || 'General network/services'}. Disruption: ${incident?.serviceDisruptionDuration || 0} mins. Financial loss: €${((incident?.estimatedFinancialLoss || 0)/100).toLocaleString()}.`,
                                likelihood,
                                impact,
                                category: "Cyber Incident Lessons Learned",
                                status: "draft"
                            });
                        }}
                        disabled={createRiskMutation.isPending}
                        className="h-10 text-xs font-semibold hover:bg-slate-50"
                    >
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                        {createRiskMutation.isPending ? "Exporting..." : "Export to Risk Register"}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="h-10 px-4 bg-brand-bright hover:bg-brand text-white font-bold rounded-xl shadow-sm text-xs"
                    >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Badge className={cn(
                        "font-bold px-4 py-2 rounded-xl uppercase tracking-widest text-xs",
                        severity === 'critical' ? "bg-red-500 text-white shadow-lg shadow-red-100" :
                            severity === 'high' ? "bg-orange-500 text-white shadow-lg shadow-orange-100" :
                                "bg-brand-bright text-white shadow-lg shadow-sky-100"
                    )}>
                        {severity.toUpperCase()} PRIORITY
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-card overflow-hidden ring-1 ring-border/50">
                        <CardHeader className="bg-muted/50 border-b border-border p-8">
                            <CardTitle className="text-xl font-bold text-foreground">Incident Core Information</CardTitle>
                            <CardDescription className="text-muted-foreground">Document the technical details and current severity standing.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-foreground">Incident Title / Summary</Label>
                                <Input
                                    className="h-12 rounded-xl border-border focus:border-brand-bright focus:ring-brand-bright/20 font-bold"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-foreground">Current Lifecycle Status</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="h-12 rounded-xl border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border">
                                            <SelectItem value="open">Open - New Report</SelectItem>
                                            <SelectItem value="investigating">Investigating - Active Analysis</SelectItem>
                                            <SelectItem value="mitigated">Mitigated - Threats Contained</SelectItem>
                                            <SelectItem value="resolved">Resolved - Fully Repaired</SelectItem>
                                            <SelectItem value="reported">Reported to Authorities</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-foreground">Priority Level</Label>
                                    <Select value={severity} onValueChange={setSeverity}>
                                        <SelectTrigger className="h-12 rounded-xl border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border">
                                            <SelectItem value="low">Low - Minimum Operational Impact</SelectItem>
                                            <SelectItem value="medium">Medium - Disruptive but Managed</SelectItem>
                                            <SelectItem value="high">High - Critical Service Interruption</SelectItem>
                                            <SelectItem value="critical">Critical - Systemic / Safety Risk</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-foreground">Suspected Root Cause</Label>
                                <Select value={cause} onValueChange={setCause}>
                                    <SelectTrigger className="h-12 rounded-xl border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border">
                                        <SelectItem value="malware">Malware / Ransomware Activity</SelectItem>
                                        <SelectItem value="phishing">Phishing / Social Engineering</SelectItem>
                                        <SelectItem value="dos">Distributed Denial of Service (DDoS)</SelectItem>
                                        <SelectItem value="vulnerability">Software Vulnerability Exploit</SelectItem>
                                        <SelectItem value="insider">Insider Threat / Error</SelectItem>
                                        <SelectItem value="unknown">Still Under Investigation</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-foreground">Detailed Description & Investigative Notes</Label>
                                <Textarea
                                    className="min-h-[160px] rounded-xl border-border focus:border-brand-bright focus:ring-brand-bright/20"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide detailed observations, indicators of compromise (IOCs), and forensic notes..."
                                />
                            </div>

                            {/* Dispatch CSIRT Regulatory Modal */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-12 rounded-xl border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
                                        NIS2 Article 23 Regulatory Notification Dispatcher
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl bg-white">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                                            <ShieldAlert className="w-5 h-5 text-amber-600" />
                                            NIS2 Art. 23 CSIRT Regulatory Notification Dispatcher
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-500">
                                            Generate compliant submissions for competent national authorities and record mandatory milestones.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <Tabs defaultValue="24h" className="w-full mt-2">
                                        <TabsList className="grid grid-cols-3 w-full">
                                            <TabsTrigger value="24h" className="text-xs font-semibold">
                                                Stage 1: 24h Early Warning
                                            </TabsTrigger>
                                            <TabsTrigger value="72h" className="text-xs font-semibold">
                                                Stage 2: 72h Incident Notice
                                            </TabsTrigger>
                                            <TabsTrigger value="1month" className="text-xs font-semibold">
                                                Stage 3: Final Report
                                            </TabsTrigger>
                                        </TabsList>

                                        {/* Stage 1 */}
                                        <TabsContent value="24h" className="space-y-4 pt-3">
                                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold">Art. 23(4)(a) Early Warning:</span> Must state whether the incident is suspected of being caused by unlawful or malicious acts, or could have a cross-border impact.
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700">Pre-formatted 24h Early Warning Draft</Label>
                                                <Textarea
                                                    readOnly
                                                    className="font-mono text-xs h-32 bg-slate-50 text-slate-800"
                                                    value={`Subject: [NIS2 Art. 23 EARLY WARNING] Significant Incident Detected\nTo: CSIRT National Authority\nEntity: Client ID #${selectedClientId}\nIncident ID: ${incidentId}\nTitle: ${title}\nDetection Time: ${incident?.detectedAt ? new Date(incident.detectedAt).toISOString() : new Date().toISOString()}\nSuspected Malicious: ${cause === 'malware' || cause === 'vulnerability' ? 'YES' : 'UNDER INVESTIGATION'}\nCross-border Potential: ${crossBorder === 'yes' ? 'YES' : 'NO'}\nInitial Description: ${description?.slice(0, 200) || 'Pending technical containment.'}`}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`[NIS2 Art. 23 EARLY WARNING] Entity #${selectedClientId} - ${title}`);
                                                        toast.success("Draft copied to clipboard");
                                                    }}
                                                    className="text-xs"
                                                >
                                                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Draft
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        updateMutation.mutate({
                                                            clientId: selectedClientId!,
                                                            incidentId,
                                                            earlyWarningSentAt: new Date().toISOString(),
                                                            status: 'reported',
                                                            reportedToAuthorities: true
                                                        }, {
                                                            onSuccess: () => toast.success("Stage 1 Early Warning Recorded")
                                                        });
                                                    }}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                                                >
                                                    <Milestone className="w-3.5 h-3.5 mr-1" /> Record 24h Warning Sent
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        {/* Stage 2 */}
                                        <TabsContent value="72h" className="space-y-4 pt-3">
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                                                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold">Art. 23(4)(b) Incident Notification:</span> Provide an initial assessment of the incident, including its severity and impact, as well as indicators of compromise (IOCs).
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700">Pre-formatted 72h Intermediate Notification</Label>
                                                <Textarea
                                                    readOnly
                                                    className="font-mono text-xs h-32 bg-slate-50 text-slate-800"
                                                    value={`Subject: [NIS2 Art. 23 INTERMEDIATE NOTICE] Incident ID #${incidentId}\nSeverity: ${severity.toUpperCase()}\nAffected Assets: ${affectedAssets || 'Under isolation'}\nImpact Duration: ${incident?.serviceDisruptionDuration || 0} minutes\nEstimated Financial Loss: €${((incident?.estimatedFinancialLoss || 0)/100).toLocaleString()}\nTechnical Assessment: ${description || 'Containment active.'}`}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`[NIS2 Art. 23 INTERMEDIATE NOTICE] ${title}`);
                                                        toast.success("Draft copied to clipboard");
                                                    }}
                                                    className="text-xs"
                                                >
                                                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Draft
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        updateMutation.mutate({
                                                            clientId: selectedClientId!,
                                                            incidentId,
                                                            intermediateReportSentAt: new Date().toISOString(),
                                                            status: 'reported',
                                                            reportedToAuthorities: true
                                                        }, {
                                                            onSuccess: () => toast.success("Stage 2 Notification Recorded")
                                                        });
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                                                >
                                                    <Milestone className="w-3.5 h-3.5 mr-1" /> Record 72h Notification Sent
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        {/* Stage 3 */}
                                        <TabsContent value="1month" className="space-y-4 pt-3">
                                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-bold">Art. 23(4)(e) Final Report:</span> Detailed description of incident, root cause, mitigation measures applied, and cross-border impact.
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700">Pre-formatted Final Incident Report</Label>
                                                <Textarea
                                                    readOnly
                                                    className="font-mono text-xs h-32 bg-slate-50 text-slate-800"
                                                    value={`Subject: [NIS2 Art. 23 FINAL REPORT] Incident ID #${incidentId} Closure\nStatus: FULLY RESOLVED\nRoot Cause: ${cause}\nDetailed Summary: ${description}\nAffected Assets Remediated: ${affectedAssets || 'Verified secured'}\nTotal Outage: ${incident?.serviceDisruptionDuration || 0} minutes`}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`[NIS2 Art. 23 FINAL REPORT] ${title}`);
                                                        toast.success("Draft copied to clipboard");
                                                    }}
                                                    className="text-xs"
                                                >
                                                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Draft
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        updateMutation.mutate({
                                                            clientId: selectedClientId!,
                                                            incidentId,
                                                            finalReportSentAt: new Date().toISOString(),
                                                            status: 'resolved'
                                                        }, {
                                                            onSuccess: () => toast.success("Stage 3 Final Report Recorded")
                                                        });
                                                    }}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Record Final Report Sent
                                                </Button>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </DialogContent>
                            </Dialog>

                            <div className="space-y-4 pt-2">
                                <Label className="text-sm font-bold text-foreground">Cross-border Significance</Label>
                                <Select value={crossBorder} onValueChange={setCrossBorder}>
                                    <SelectTrigger className="h-10 rounded-xl border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border">
                                        <SelectItem value="no">Single Member State Only</SelectItem>
                                        <SelectItem value="yes">EU Cross-border Impact</SelectItem>
                                        <SelectItem value="unknown">Impact Unknown</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* NIS2 Classification Panel (UI-STANDARD §16) */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-card overflow-hidden ring-1 ring-border/50">
                        <CardHeader className="bg-muted/50 border-b border-border p-8 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-brand-bright" />
                                    NIS2 Article 23 Classification & Deadlines
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Evaluates regulatory thresholds and tracks statutory CSIRT submission windows.
                                </CardDescription>
                            </div>
                            {classificationMeta && (
                                <Badge className={cn("font-bold px-3 py-1 text-xs uppercase", classificationMeta.badgeClass)}>
                                    {classificationMeta.label}
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            {classificationLoading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : classificationError ? (
                                <p className="text-sm text-destructive">Failed to evaluate NIS2 classification.</p>
                            ) : classification ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl border border-border bg-muted/20">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Regulatory Severity</p>
                                            <p className="text-base font-bold text-foreground mt-1 capitalize">{classification.severity}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{classificationMeta?.description}</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-border bg-muted/20">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Next Reporting Window</p>
                                            <p className="text-base font-bold text-foreground mt-1">
                                                {deadlines ? getNextDeadlineLabel(deadlines) : "—"}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {classification.isSignificant
                                                    ? "Mandatory CSIRT submission required."
                                                    : "Below significance threshold; monitoring."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Deadline Timeline */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Statutory Reporting Windows</h4>
                                        {deadlinesLoading ? (
                                            <Skeleton className="h-24 w-full" />
                                        ) : deadlinesError ? (
                                            <p className="text-xs text-destructive">Failed to calculate deadlines.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {deadlineRows.map((row) => (
                                                    <div
                                                        key={row.key}
                                                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-xs"
                                                    >
                                                        <div className="space-y-0.5">
                                                            <p className="font-bold text-foreground">{row.label}</p>
                                                            <p className="text-muted-foreground text-[11px]">{row.window}</p>
                                                        </div>
                                                        <div className="text-right space-y-0.5">
                                                            <p className="font-mono font-medium text-foreground">{row.date}</p>
                                                            {row.meta && (
                                                                <Badge className={cn("text-[10px] px-2 py-0.5 uppercase", row.meta.badgeClass)}>
                                                                    {row.meta.label}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Rationale & Triggered Criteria */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Evaluation Rationale</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border">
                                            {classification.rationale}
                                        </p>
                                    </div>

                                    {classification.triggeredCriteria && classification.triggeredCriteria.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Triggered Criteria</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {classification.triggeredCriteria.map((c: string) => (
                                                    <Badge key={c} variant="outline" className="text-xs font-mono">
                                                        {c}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* CSIRT Template Generator */}
                                    <div className="pt-4 border-t border-border space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-brand-bright" />
                                                CSIRT Notification Template
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <Select value={templateCountry} onValueChange={setTemplateCountry}>
                                                    <SelectTrigger className="h-8 w-28 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {EU_COUNTRIES.map((c) => (
                                                            <SelectItem key={c.code} value={c.code} className="text-xs">
                                                                {c.code} — {c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs"
                                                    onClick={() => setTemplateRequested(true)}
                                                >
                                                    Generate
                                                </Button>
                                            </div>
                                        </div>

                                        {templateRequested && (
                                            templateLoading ? (
                                                <Skeleton className="h-28 w-full" />
                                            ) : templateError ? (
                                                <p className="text-xs text-destructive">Failed to build template.</p>
                                            ) : csirtTemplate ? (
                                                <div className="space-y-2 bg-muted/30 p-3 rounded-xl border border-border text-xs font-mono">
                                                    <p className="text-[11px] text-muted-foreground font-sans">
                                                        Authority: <span className="font-bold text-foreground">{csirtTemplate.authorityName}</span> ({csirtTemplate.authorityEmail || "email on file"})
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground font-sans font-bold">Subject: {csirtTemplate.subject}</p>
                                                    <pre className="whitespace-pre-wrap text-[11px] text-foreground bg-background p-2 rounded border border-border max-h-40 overflow-y-auto">
                                                        {csirtTemplate.body}
                                                    </pre>
                                                </div>
                                            ) : null
                                        )}
                                    </div>
                                </>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* Timeline & Escalations Panel */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-card overflow-hidden ring-1 ring-border/50">
                        <CardHeader className="bg-muted/50 border-b border-border p-8">
                            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                <Clock className="h-5 w-5 text-brand-bright" />
                                NIS2 Incident Progression & Escalations
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Step-by-step regulatory milestone progression with overdue escalation flags.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            {timelineLoading || escalationsLoading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-24 w-full" />
                                </div>
                            ) : timelineError || escalationsError ? (
                                <p className="text-sm text-destructive">Failed to load incident progression.</p>
                            ) : (
                                <>
                                    {/* Phase sequence */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Milestone Phases</h4>
                                        <div className="space-y-2">
                                            {timeline?.phases.map((p) => {
                                                const meta = getPhaseMeta(p.status);
                                                return (
                                                    <div
                                                        key={p.phase}
                                                        className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-xs"
                                                    >
                                                        <div className="space-y-0.5">
                                                            <p className="font-bold text-foreground">{p.label}</p>
                                                            <p className="text-muted-foreground text-[11px]">
                                                                Status: {INCIDENT_PHASE_STATUS_LABEL[p.status]}
                                                            </p>
                                                        </div>
                                                        <div className="text-right space-y-0.5">
                                                            <p className="font-mono text-muted-foreground text-[11px]">
                                                                {p.completedAt ? format(new Date(p.completedAt), "MMM d, HH:mm") : p.targetDeadline ? format(new Date(p.targetDeadline), "MMM d, HH:mm") : "—"}
                                                            </p>
                                                            <Badge className={cn("text-[10px] px-2 py-0.5 uppercase", meta.badgeClass)}>
                                                                {meta.label}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Escalation items */}
                                    <div className="space-y-3 pt-4 border-t border-border">
                                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            Active Escalations ({orderedEscalations.length})
                                        </h4>
                                        {orderedEscalations.length > 0 ? (
                                            <ul className="space-y-2">
                                                {orderedEscalations.map((esc) => {
                                                    const meta = getEscalationMeta(esc.severity);
                                                    const overdue = isEscalationOverdue(esc);
                                                    return (
                                                        <li
                                                            key={esc.id}
                                                            className={cn(
                                                                "p-3 rounded-xl border text-xs space-y-1",
                                                                overdue ? "border-red-300 bg-red-50/40" : "border-border bg-card"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-foreground">{esc.title}</span>
                                                                <Badge className={cn("text-[10px] uppercase", meta.badgeClass)}>
                                                                    {meta.label}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-muted-foreground text-[11px]">{esc.reason}</p>
                                                            {esc.actionRequired && (
                                                                <p className="text-foreground text-[11px] font-medium">
                                                                    Action: {esc.actionRequired}
                                                                </p>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">No active escalations.</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Context */}
                <div className="space-y-8">
                    {/* BCP & Disaster Recovery Activation Bridge */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/50">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                            <CardTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <LifeBuoy className="h-5 w-5 text-emerald-600" />
                                    BCP & Continuity Response
                                </span>
                                <Badge className={cn(
                                    "text-[10px] font-bold uppercase",
                                    incident?.isContinuityTriggered ? "bg-red-500 text-white" : "bg-emerald-100 text-emerald-800"
                                )}>
                                    {incident?.isContinuityTriggered ? "BCP Mobilized" : "Standby"}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                NIS2 Article 21(2)(c) Business continuity & disaster recovery link.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Continuity Trigger:</span>
                                    <span className="font-bold text-slate-900">
                                        {incident?.isContinuityTriggered ? "Active Mobilization" : "Not Triggered"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 font-medium">Target Emergency Call Tree:</span>
                                    <span className="font-bold text-emerald-600">Level 1 - Core Leadership</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={() => {
                                    if (!selectedClientId) return;
                                    updateMutation.mutate({
                                        clientId: selectedClientId,
                                        incidentId,
                                        isContinuityTriggered: true
                                    }, {
                                        onSuccess: () => {
                                            toast.success("BCP Continuity Response Mobilized!");
                                            setLocation(`/clients/${selectedClientId}/business-continuity/call-tree`);
                                        }
                                    });
                                }}
                                className="w-full h-11 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2"
                            >
                                <PhoneCall className="w-4 h-4 animate-pulse" />
                                🚨 Activate BCP Call Tree
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Affected Assets */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-card overflow-hidden ring-1 ring-border/50">
                        <CardHeader className="bg-muted/50 border-b border-border p-6">
                            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-brand-bright" />
                                Affected Systems
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <Textarea
                                className="min-h-[120px] rounded-xl border-border focus:border-brand-bright focus:ring-brand-bright/20"
                                value={affectedAssets}
                                onChange={(e) => setAffectedAssets(e.target.value)}
                                placeholder="List systems, databases, or cloud services affected..."
                            />
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-brand overflow-hidden text-white">
                        <CardHeader className="border-b border-white/10 p-6">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Event Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Detection Date</div>
                                <div className="text-sm font-medium">{incident?.detectedAt && format(new Date(incident.detectedAt), "PPP p")}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Initial Report</div>
                                <div className="text-sm font-medium">{incident?.createdAt && format(new Date(incident.createdAt), "PPP p")}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Last Modified</div>
                                <div className="text-sm font-medium">{incident?.updatedAt && format(new Date(incident.updatedAt), "PPP p")}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
