import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    FileText, CheckCircle2, Clock, AlertCircle,
    Sparkles, Inbox, Search, Filter, MoreHorizontal,
    Users, Building2, ArrowUpRight
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@complianceos/ui/ui/table";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function AdvisorWorkbench() {
    const [, setLocation] = useLocation();
    const { data: allIntakeItems, isLoading } = trpc.intake.listAll.useQuery();
    const { data: clients } = trpc.clients.list.useQuery();
    const updateMutation = trpc.clients.updateContactInfo.useMutation();

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Sparkles className="h-8 w-8 text-indigo-600" />
                            Advisor Workbench
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            Centralized Evidence Triage. Manage intake items across all managed clients.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Card className="px-6 py-2 bg-slate-50 border-slate-200">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Clients</div>
                            <div className="text-2xl font-bold text-slate-900">12</div>
                        </Card>
                        <Card className="px-6 py-2 bg-indigo-50 border-indigo-100">
                            <div className="text-xs text-indigo-500 uppercase font-bold tracking-wider">Pending Triage</div>
                            <div className="text-2xl font-bold text-indigo-700">{allIntakeItems?.filter(i => i.status === 'pending').length || 0}</div>
                        </Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Global Intake Queue */}
                    <Card className="shadow-lg border-slate-200 lg:col-span-2">
                        <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Global Intake Queue</CardTitle>
                                <CardDescription>Review and map evidence for all clients.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                    <Search className="h-4 w-4 mr-2" /> Search
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/30">
                                        <TableHead className="w-[150px]">Client</TableHead>
                                        <TableHead>File Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>AI Suggestion</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-20 text-slate-400 italic">
                                                Loading global queue...
                                            </TableCell>
                                        </TableRow>
                                    ) : allIntakeItems?.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    <span className="font-semibold text-slate-700 truncate max-w-[120px]">{item.clientName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                    <span className="truncate max-w-[150px]">{item.filename}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={item.status === 'mapped' ? 'success' : item.status === 'classified' ? 'secondary' : 'outline'}
                                                    className="capitalize"
                                                >
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                                    <Sparkles className="h-3 w-3 text-amber-500" />
                                                    {item.classification || "Pending AI"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => setLocation(`/clients/${item.clientId}/intake`)}
                                                >
                                                    Triage <ArrowUpRight className="h-3 w-3 ml-1" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Proactive AI Suggestions Panel */}
                    <Card className="shadow-lg border-indigo-100 bg-indigo-50/10">
                        <CardHeader className="bg-white/50 border-b border-indigo-100">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-indigo-600" />
                                <CardTitle className="text-indigo-900">Proactive AI Suggestions</CardTitle>
                            </div>
                            <CardDescription>Automated drift detection & optimizations</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <ProactiveSuggestionsPanel />
                        </CardContent>
                    </Card>
                </div>

                {/* Client Portfolio Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Users className="h-6 w-6 text-indigo-600" />
                            Client Portfolio Management
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clients?.filter(c => c.serviceModel !== 'subscription').map(client => (
                            <Card key={client.id} className="border-slate-200 hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{client.name}</CardTitle>
                                            <CardDescription>{client.industry}</CardDescription>
                                        </div>
                                        <Badge variant={client.serviceModel === 'managed' ? 'success' : 'secondary'}>
                                            {client.serviceModel}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Focus</label>
                                        <textarea
                                            className="w-full min-h-[80px] text-sm p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                                            placeholder="Set the goal for this week..."
                                            defaultValue={client.weeklyFocus || ''}
                                            onBlur={(e) => {
                                                updateMutation.mutate({
                                                    clientId: client.id,
                                                    weeklyFocus: e.target.value
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Compliance Score</span>
                                        <span className="font-bold text-indigo-600">{client.targetComplianceScore || 0}%</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                                        onClick={() => setLocation(`/clients/${client.id}`)}
                                    >
                                        Go to Workspace <ArrowUpRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function ProactiveSuggestionsPanel() {
    const { data: suggestions, isLoading } = trpc.proactiveAdvisor.listAllSuggestions.useQuery();
    const applyMutation = trpc.proactiveAdvisor.applyRecommendation.useMutation();

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    if (!suggestions || suggestions.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                No active suggestions. System is healthy.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {suggestions.map((s) => (
                <div key={s.id} className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-2 hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between">
                        <Badge 
                            variant={s.severity === 'high' ? 'destructive' : s.severity === 'medium' ? 'warning' : 'secondary'}
                            className="text-[10px] uppercase font-bold px-1.5 py-0"
                        >
                            {s.severity}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{s.clientName}</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-slate-900">{s.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{s.description}</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-8 text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-50"
                        onClick={() => {
                            applyMutation.mutate({
                                clientId: s.clientId || 0,
                                suggestionId: s.id,
                                action: s.recommendedAction
                            });
                        }}
                    >
                        Apply Fix
                    </Button>
                </div>
            ))}
        </div>
    );
}
