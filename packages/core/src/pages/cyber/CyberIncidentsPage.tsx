import React from "react";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { Plus, AlertTriangle, Search, Filter, Eye, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@complianceos/ui/ui/input";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { PageGuide } from "@/components/PageGuide";
import { cn } from "@/lib/utils";

export default function CyberIncidentsPage() {
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();

    const { data: incidents, isLoading } = trpc.cyber.getIncidents.useQuery(
        { clientId: selectedClientId! },
        { enabled: !!selectedClientId }
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "resolved": return "bg-green-500/10 text-foreground dark:text-green-400 ring-1 ring-green-500/20";
            case "mitigated": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20";
            case "investigating": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20";
            default: return "bg-muted text-muted-foreground ring-1 ring-border";
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <PageGuide
                    title="Incident Management"
                    description="Track and manage cyber security incidents reported under NIS2."
                    rationale="Centralized incident tracking ensures timely reporting (24h/72h) and effective response."
                    howToUse={[
                        { step: "Report", description: "Log new incidents immediately upon detection." },
                        { step: "Monitor", description: "Track status and severity of open incidents." },
                        { step: "Resolve", description: "Document mitigation steps and close incidents." }
                    ]}
                />
                <Button
                    onClick={() => setLocation(`/clients/${selectedClientId}/cyber/incidents/new`)}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-12 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex-shrink-0"
                >
                    <Plus className="mr-2 h-5 w-5" /> Report New Incident
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-border shadow-lg rounded-2xl bg-card overflow-hidden ring-1 ring-border">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-foreground leading-none">
                                    {incidents?.filter(i => i.status === 'open' || i.status === 'investigating').length || 0}
                                </div>
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Open Incidents</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-lg rounded-2xl bg-card overflow-hidden ring-1 ring-border">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-destructive leading-none">
                                    {incidents?.filter(i => i.severity === 'critical' && i.status !== 'resolved').length || 0}
                                </div>
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Critical (Active)</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-lg rounded-2xl bg-card overflow-hidden ring-1 ring-border">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-3xl font-black text-foreground leading-none">
                                    {incidents?.filter(i => i.status === 'resolved').length || 0}
                                </div>
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Resolved (All Time)</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            <Card className="border-border shadow-lg rounded-2xl bg-card overflow-hidden ring-1 ring-border">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="text-xl font-bold text-foreground">Incident Registry</CardTitle>
                        <div className="flex gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search incidents..."
                                    className="pl-9 h-10 rounded-xl border-border focus:border-brand-bright focus:ring-brand-bright/20"
                                />
                            </div>
                            <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-border">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-xl border border-border shadow-lg overflow-hidden bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-brand hover:bg-brand border-0">
                                    <TableHead className="text-white font-bold h-14 pl-6 w-32">Severity</TableHead>
                                    <TableHead className="text-white font-bold h-14">Incident / ID</TableHead>
                                    <TableHead className="text-white font-bold h-14">Status</TableHead>
                                    <TableHead className="text-white font-bold h-14">Detected</TableHead>
                                    <TableHead className="text-white font-bold h-14">Reporter</TableHead>
                                    <TableHead className="text-white text-right font-bold h-14 pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="h-8 w-8 text-brand-bright animate-spin" />
                                                <p className="text-sm font-bold text-muted-foreground">Retrieving incident logs...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : incidents?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <p className="text-sm font-bold text-muted-foreground">No security incidents recorded.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    incidents?.map((incident, idx) => (
                                        <TableRow
                                            key={incident.id}
                                            className="bg-sky-50 border-b border-sky-100 transition-all hover:bg-sky-100 hover:shadow-sm cursor-pointer group"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <TableCell className="pl-6 font-medium">
                                            <Badge className={cn(
                                                "font-bold px-3 py-1 rounded-full uppercase tracking-widest text-[10px]",
                                                incident.severity === 'critical' ? "bg-destructive text-destructive-foreground" :
                                                    incident.severity === 'high' ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20" :
                                                        incident.severity === 'medium' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20"
                                            )}>
                                                {incident.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-foreground">{incident.title}</div>
                                                {incident.isSignificant && (
                                                    <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold px-2 py-0 text-[10px] uppercase">Significant</Badge>
                                                )}
                                            </div>
                                            <div className="text-xs font-bold text-muted-foreground mt-0.5 uppercase tracking-widest">ID-INC-{incident.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "border-none font-bold px-3 py-1 rounded-full",
                                                getStatusColor(incident.status || 'open')
                                            )}>
                                                {incident.status?.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600 font-medium">
                                            {incident.detectedAt && format(new Date(incident.detectedAt), "MMM d, HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-slate-600 font-medium">{incident.reporterName || 'Sytem'}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setLocation(`/clients/${selectedClientId}/cyber/incidents/${incident.id}`)}
                                                className="h-9 px-4 rounded-lg font-bold text-brand hover:bg-sky-50 hover:text-brand-bright transition-all"
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        </div>
    );
}
