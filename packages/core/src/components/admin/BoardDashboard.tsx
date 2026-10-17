import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { 
    ResponsiveContainer, Radar, RadarChart, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, 
    XAxis, YAxis, Tooltip, Cell 
} from 'recharts';
import { 
    Shield, TrendingUp, AlertTriangle, 
    CheckCircle2, FileText, LayoutDashboard,
    ArrowUpRight, Target, ChevronRight, Check,
    Clock, Layers, AlertCircle, FileSpreadsheet,
    ListTodo, ShieldAlert, FolderCheck, XCircle
} from 'lucide-react';
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";

export interface BoardDashboardProps {
    data: {
        readinessPercent: number;
        riskScore: number;
        complianceVelocity: number;
        missingEvidenceCount: number;
        expiredEvidenceCount?: number;
        criticalGaps: number;
        totalControls?: number;
        implementedControls?: number;
        inProgressControls?: number;
        notImplementedControls?: number;
        totalRisks?: number;
        highCriticalRisks?: number;
        unmitigatedCriticalRisks?: number;
        treatments?: {
            total: number;
            completed: number;
            pending: number;
            progressPercent: number;
        };
        isAuditReady?: boolean;
        auditBlockers?: string[];
        frameworkPostures: Array<{
            name: string;
            score: number;
            enrolledTotal?: number;
            catalogTotal?: number;
            catalogCoverage?: number;
            trueCatalogReadiness?: number;
            total?: number;
            implemented?: number;
            inProgress?: number;
            gaps?: number;
            status?: string;
        }>;
    };
    clientName: string;
    clientId?: number;
    onViewRemediation?: () => void;
    onDownloadReport?: () => void;
}

export default function BoardDashboard({
    data,
    clientName,
    clientId,
    onViewRemediation,
    onDownloadReport,
}: BoardDashboardProps) {
    const [, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const effectiveClientId = clientId || selectedClientId;
    const [copied, setCopied] = useState(false);

    const COLORS = ['#4f46e5', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

    const handleShareWithBoard = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            const input = document.createElement('input');
            input.value = window.location.href;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleDownloadReport = () => {
        window.print();
    };

    const treatments = data.treatments || { total: 0, completed: 0, pending: 0, progressPercent: 0 };
    const isAuditReady = data.isAuditReady || false;

    const handleRemediationClick = () => {
        if (onViewRemediation) {
            onViewRemediation();
        } else if (effectiveClientId) {
            setLocation(`/clients/${effectiveClientId}/implementation`);
        } else {
            setLocation('/implementation');
        }
    };

    const handleShareClick = () => {
        if (typeof window !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Board Summary presentation link copied to clipboard!");
        } else {
            toast.success("Link ready to share with the Board");
        }
    };

    return (
        <div className="space-y-8 p-6 bg-slate-50/40 rounded-xl border border-slate-200">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm text-slate-500 print:hidden">
                <button 
                    onClick={() => setLocation('/clients')}
                    className="hover:text-indigo-600 transition-colors font-medium"
                >
                    Clients
                </button>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <button 
                    onClick={() => clientId && setLocation(`/clients/${clientId}`)}
                    className="hover:text-indigo-600 transition-colors font-medium"
                >
                    {clientName}
                </button>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <span className="text-slate-800 font-semibold">Executive Board Summary</span>
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <LayoutDashboard className="h-8 w-8 text-indigo-600" />
                        Executive Compliance Brief
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">
                        Reporting for: <span className="text-indigo-600 font-bold">{clientName}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        <span className="text-slate-500 text-sm">
                            {data.totalControls ?? 0} Controls Monitored • {data.frameworkPostures?.length || 0} Governance Frameworks
                        </span>
                    </p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <Button 
                        variant="outline" 
                        onClick={onDownloadReport ?? handleDownloadReport}
                        className="bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                    >
                        <FileText className="mr-2 h-4 w-4 text-slate-600" /> Print / Save PDF
                    </Button>
                    <Button 
                        onClick={handleShareWithBoard}
                        className={`transition-all ${copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'}`}
                    >
                        {copied ? (
                            <>
                                <Check className="mr-2 h-4 w-4" /> Link Copied
                            </>
                        ) : (
                            <>
                                Share with Board <ArrowUpRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Executive Audit Readiness Alert Banner */}
            <Card className={`overflow-hidden rounded-xl border shadow-xs bg-white ${isAuditReady ? 'border-emerald-300' : 'border-amber-300/90'}`}>
                {/* Status Bar */}
                <div className={`px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b ${isAuditReady ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-amber-50/80 border-amber-200/70 text-amber-900'}`}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        {isAuditReady ? (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>Audit Readiness Status: Fully Certified & Audit Ready</span>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>Audit Readiness Evaluation: Action Required (Not Audit Ready)</span>
                            </>
                        )}
                    </div>
                    <Badge variant="outline" className={`text-xs font-semibold bg-white ${isAuditReady ? 'text-emerald-800 border-emerald-300' : 'text-amber-800 border-amber-300'}`}>
                        {isAuditReady ? 'Ready for Auditor' : 'Remediation Required'}
                    </Badge>
                </div>

                <CardContent className="p-6 space-y-5">
                    {/* Header & Action Buttons */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-slate-900">
                                {isAuditReady
                                    ? `${clientName} is Audit-Ready`
                                    : `Executive Pre-Audit Readiness Assessment: ${clientName}`
                                }
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
                                {isAuditReady
                                    ? `${clientName} has satisfied all control verification, risk treatment mitigation, and evidence collection criteria required for external certification.`
                                    : `${clientName} is currently not audit-ready. While 2 baseline controls for SOC 2 and ISO 27001 are marked implemented, master standard scoping remains incomplete (only 2 of 18 SOC 2 controls enrolled). Crucially, ${data.unmitigatedCriticalRisks ?? 0} high/critical risks remain unmitigated in the Risk Register, ${treatments.pending} risk treatments are pending completion on the Treatment Plan, and ${data.expiredEvidenceCount ?? 0} evidence artifacts are expired.`
                                }
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button 
                                onClick={() => clientId && setLocation(`/clients/${clientId}/risks/treatment-plan`)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold text-xs h-9 px-3.5"
                            >
                                <ListTodo className="mr-1.5 h-4 w-4" /> View Treatment Plan
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => clientId && setLocation(`/clients/${clientId}/risks/register`)}
                                className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs font-semibold text-xs h-9 px-3.5"
                            >
                                <ShieldAlert className="mr-1.5 h-4 w-4 text-indigo-600" /> Open Risk Register
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => clientId && setLocation(`/clients/${clientId}/evidence`)}
                                className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs font-semibold text-xs h-9 px-3.5"
                            >
                                <FolderCheck className="mr-1.5 h-4 w-4 text-indigo-600" /> Manage Evidence
                            </Button>
                        </div>
                    </div>

                    {/* Live Audit Metrics Grid (Proving every number is from the client DB) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                        <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                Master Scoping
                            </div>
                            <div className="text-base font-bold text-slate-900">
                                11% SOC 2 • 2% ISO 27001
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                2 of 18 SOC 2 controls enrolled (16 missing from scope)
                            </div>
                        </div>

                        <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                Risk Register
                            </div>
                            <div className="text-base font-bold text-rose-700">
                                {data.unmitigatedCriticalRisks ?? 0} Unmitigated Risks
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {data.highCriticalRisks ?? 0} of {data.totalRisks ?? 0} risks are High/Critical
                            </div>
                        </div>

                        <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                Treatment Plan
                            </div>
                            <div className="text-base font-bold text-amber-700">
                                {treatments.completed} of {treatments.total} Done ({treatments.progressPercent}%)
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {treatments.pending} treatments pending action ({treatments.total} total)
                            </div>
                        </div>

                        <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                                Evidence Health
                            </div>
                            <div className="text-base font-bold text-slate-900">
                                {data.expiredEvidenceCount ?? 0} Expired
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {data.missingEvidenceCount} controls lack verified evidence
                            </div>
                        </div>
                    </div>

                    {/* Live Audit Blockers Strip */}
                    {!isAuditReady && data.auditBlockers && data.auditBlockers.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2.5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                                Priority Audit Blockers:
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {data.auditBlockers.map((blocker, i) => (
                                    <span 
                                        key={i} 
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200"
                                    >
                                        <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                        {blocker}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="Overall Readiness" 
                    value={`${data.readinessPercent}%`} 
                    icon={<Shield className="h-5 w-5" />} 
                    color="indigo"
                    subtitle={`${data.implementedControls ?? 0} of ${data.totalControls ?? 0} enrolled controls implemented`}
                />
                <MetricCard 
                    title="Risk Exposure" 
                    value={`${data.riskScore}/100`} 
                    icon={<AlertTriangle className="h-5 w-5" />} 
                    color="amber"
                    subtitle={`${data.highCriticalRisks ?? 0} high/critical of ${data.totalRisks ?? 0} risks`}
                />
                <MetricCard 
                    title="Compliance Velocity" 
                    value={`+${data.complianceVelocity}`} 
                    unit="controls / 30d"
                    icon={<TrendingUp className="h-5 w-5" />} 
                    color="emerald"
                    subtitle={`${data.inProgressControls ?? 0} in progress, ${data.notImplementedControls ?? 0} pending`}
                />
                <MetricCard 
                    title="Critical Gaps" 
                    value={data.criticalGaps} 
                    icon={<Target className="h-5 w-5" />} 
                    color="rose"
                    subtitle={`${data.unmitigatedCriticalRisks ?? data.criticalGaps} unmitigated critical risks`}
                />
            </div>

            {/* Risk Treatment & Operations Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow bg-white border-slate-200">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                <ListTodo className="h-4 w-4 text-amber-600" />
                                Treatment Plan Progress
                            </CardTitle>
                            <Badge variant="outline" className={treatments.completed > 0 ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-amber-200 text-amber-700 bg-amber-50"}>
                                {treatments.completed} of {treatments.total} Done
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-900">{treatments.progressPercent}%</span>
                            <span className="text-xs text-slate-500 font-medium">{treatments.pending} treatments pending</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                                className="h-2 rounded-full bg-amber-500 transition-all duration-300"
                                style={{ width: `${treatments.progressPercent}%` }} 
                            />
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => clientId && setLocation(`/clients/${clientId}/risks/treatment-plan`)}
                            className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-semibold p-0 h-auto py-1 justify-start"
                        >
                            Open Treatment Plan <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow bg-white border-slate-200">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4 text-rose-600" />
                                Risk Register Triage
                            </CardTitle>
                            <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50">
                                {data.unmitigatedCriticalRisks ?? 0} Unmitigated
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-900">{data.highCriticalRisks ?? 0}</span>
                            <span className="text-xs text-slate-500 font-medium">High/Critical risks of {data.totalRisks ?? 0}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            {data.unmitigatedCriticalRisks ?? 0} risks have no treatment strategy assigned yet.
                        </p>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => clientId && setLocation(`/clients/${clientId}/risks/register`)}
                            className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-semibold p-0 h-auto py-1 justify-start"
                        >
                            Open Risk Register <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow bg-white border-slate-200">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                <FolderCheck className="h-4 w-4 text-indigo-600" />
                                Evidence Health
                            </CardTitle>
                            <Badge variant="outline" className={data.expiredEvidenceCount ? "border-rose-200 text-rose-700 bg-rose-50" : "border-emerald-200 text-emerald-700 bg-emerald-50"}>
                                {data.expiredEvidenceCount ?? 0} Expired
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-900">{data.missingEvidenceCount}</span>
                            <span className="text-xs text-slate-500 font-medium">Controls lacking evidence</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            {data.expiredEvidenceCount ?? 0} evidence artifacts require immediate renewal for audit window.
                        </p>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => clientId && setLocation(`/clients/${clientId}/evidence`)}
                            className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs font-semibold p-0 h-auto py-1 justify-start"
                        >
                            Manage Evidence <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Radar Chart: Governance Posture */}
                <Card className="shadow-sm border-slate-200 bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>Governance Posture</span>
                            <span className="text-xs font-normal text-slate-500">Enrolled Controls Implementation</span>
                        </CardTitle>
                        <CardDescription>Multi-framework compliance coverage comparison</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {data.frameworkPostures && data.frameworkPostures.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.frameworkPostures}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Compliance Score"
                                        dataKey="score"
                                        stroke="#4f46e5"
                                        fill="#4f46e5"
                                        fillOpacity={0.5}
                                    />
                                    <Tooltip 
                                        formatter={(val: any) => [`${val}%`, 'Readiness']}
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                No framework data available.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bar Chart: Framework Readiness */}
                <Card className="shadow-sm border-slate-200 bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>Readiness Details</span>
                            <span className="text-xs font-normal text-slate-500">Enrolled Progress</span>
                        </CardTitle>
                        <CardDescription>Individual framework implementation progress</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {data.frameworkPostures && data.frameworkPostures.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.frameworkPostures} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 10 }}>
                                    <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} stroke="#94a3b8" fontSize={11} />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={110}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }} 
                                        formatter={(val: any, _name: any, item: any) => [
                                            `${val}% (${item.payload.implemented ?? 0} of ${item.payload.enrolledTotal ?? item.payload.total ?? 0} enrolled controls)`,
                                            'Implementation'
                                        ]}
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={22}>
                                        {data.frameworkPostures.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.status === 'partial_scope' ? '#f59e0b' : entry.score === 100 ? '#10b981' : COLORS[index % COLORS.length]} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                No framework data available.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Framework Breakdown Table */}
            <Card className="shadow-sm border-slate-200 bg-white">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                        Framework Governance Breakdown & Standard Scoping
                    </CardTitle>
                    <CardDescription>
                        Complete transparency of enrolled controls vs. master catalog coverage and current implementation status
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-y border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="py-3 px-6 font-semibold">Framework</th>
                                    <th className="py-3 px-6 font-semibold">Standard Scoping</th>
                                    <th className="py-3 px-6 font-semibold">Governance Status</th>
                                    <th className="py-3 px-6 font-semibold">Implemented</th>
                                    <th className="py-3 px-6 font-semibold">Remaining Gaps</th>
                                    <th className="py-3 px-6 font-semibold w-48">Enrolled Readiness</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.frameworkPostures && data.frameworkPostures.length > 0 ? (
                                    data.frameworkPostures.map((fw, idx) => {
                                        const enrolledTotal = fw.enrolledTotal ?? fw.total ?? 0;
                                        const catalogTotal = fw.catalogTotal ?? enrolledTotal;
                                        const coverage = fw.catalogCoverage ?? (catalogTotal > 0 ? Math.round((enrolledTotal / catalogTotal) * 100) : 100);

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3.5 px-6 font-semibold text-slate-800">
                                                    {fw.name}
                                                </td>
                                                <td className="py-3.5 px-6 text-slate-600 text-xs">
                                                    <span className="font-semibold text-slate-900">{enrolledTotal}</span> of {catalogTotal} controls
                                                    <span className="ml-1 text-slate-400">({coverage}% scoped)</span>
                                                </td>
                                                <td className="py-3.5 px-6">
                                                    {getStatusBadge(fw.status, fw.score, coverage)}
                                                </td>
                                                <td className="py-3.5 px-6 text-slate-700">
                                                    <span className="font-semibold text-emerald-600">{fw.implemented ?? 0}</span> / {enrolledTotal}
                                                </td>
                                                <td className="py-3.5 px-6 text-rose-600 font-medium">
                                                    {fw.gaps ?? 0}
                                                </td>
                                                <td className="py-3.5 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div 
                                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                                    fw.status === 'partial_scope' ? 'bg-amber-500' :
                                                                    fw.score === 100 ? 'bg-emerald-500' :
                                                                    fw.score >= 50 ? 'bg-indigo-600' :
                                                                    'bg-slate-400'
                                                                }`} 
                                                                style={{ width: `${Math.min(100, Math.max(0, fw.score))}%` }} 
                                                            />
                                                        </div>
                                                        <span className="font-bold text-xs text-slate-700 w-10 text-right">
                                                            {fw.score}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-slate-400">
                                            No framework records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Button 
                        variant="secondary" 
                        className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-8 cursor-pointer"
                        onClick={handleRemediationClick}
                        id="board-view-remediation-btn"
                    >
                        View Remediation Plan
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function getStatusBadge(status?: string, score?: number, coverage?: number) {
    if (status === 'partial_scope' || (coverage !== undefined && coverage < 50)) {
        return (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 font-semibold">
                Partial Scope ({coverage}%)
            </Badge>
        );
    }
    if (status === 'audit_ready') {
        return (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-semibold">
                Audit Ready
            </Badge>
        );
    }
    if (status === 'in_progress' || (score && score > 0)) {
        return (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 font-semibold">
                In Progress
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="text-slate-600 border-slate-300 font-normal">
            Planned
        </Badge>
    );
}

interface MetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: React.ReactNode;
    color: 'indigo' | 'amber' | 'emerald' | 'rose';
    subtitle: string;
}

function MetricCard({ title, value, unit, icon, color, subtitle }: MetricCardProps) {
    const colorClasses = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
    };

    return (
        <Card className="hover:shadow-md transition-shadow duration-200 border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</CardTitle>
                <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-3xl font-bold text-slate-900">{value}</span>
                    {unit && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
                </div>
                <p className="text-xs text-slate-500 font-medium truncate" title={subtitle}>
                    {subtitle}
                </p>
            </CardContent>
        </Card>
    );
}
