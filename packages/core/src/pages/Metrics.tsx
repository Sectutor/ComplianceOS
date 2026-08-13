
import React, { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useClientContext } from '@/contexts/ClientContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@complianceos/ui/ui/card';
import { Progress } from '@complianceos/ui/ui/progress';
import { Badge } from '@complianceos/ui/ui/badge';
import {
    Loader2, ShieldAlert, CheckCircle, TrendingUp, BarChart3, Activity,
    Users, Server, FileCheck, Truck, Zap, AlertTriangle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

import DashboardLayout from '@/components/DashboardLayout';

export default function MetricsPage() {
    const { id } = useParams();
    const { selectedClientId } = useClientContext();
    const clientId = id ? parseInt(id) : selectedClientId;

    const { data: dashboard, isLoading, error } = trpc.metrics.getDashboard.useQuery(
        { clientId: clientId! },
        { enabled: !!clientId }
    );

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !dashboard) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-red-500">
                    Failed to load metrics dashboard.
                </div>
            </DashboardLayout>
        );
    }

    const {
        strategic = { riskAppetiteConsumption: 0, criticalRisksUnmitigated: 0, riskVelocity: 0, topRiskCategories: [] },
        cyber = { mttr: 0, vulnDensity: 0, openVulns: 0, assetCriticalityCoverage: 0 },
        culture = { policyAckRate: 0, trainingCompletionRate: 0, humanErrorCount: 0 },
        supplyChain = { avgCriticalVendorRisk: 0, criticalVendors: 0, vendorAssessmentCoverage: 0 },
        compliance = { controlEffectiveness: 0, totalControls: 0, implementedControls: 0, evidenceVerificationRate: 0 },
        resilience = { biaCompletionRate: 0, activeProjects: 0 },
        ops = { significantIncidents: 0, crossBorderIncidents: 0, reportingTimeliness: 100, avgBreachDetectionDays: 0, notifiableBreaches: 0 }
    } = (dashboard as any) || {};

    return (
        <DashboardLayout>
            <div className="space-y-6 w-full max-w-full">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Executive Metrics</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
                            Risk, Security & Compliance
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                        <Activity className="h-3 w-3 text-green-500" />
                        <span>Live Performance Monitor</span>
                    </div>
                </div>

                {/* EXECUTIVE SUMMARY ROW */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <MetricCard
                        title="Risk Appetite"
                        value={`${strategic.riskAppetiteConsumption}%`}
                        icon={BarChart3}
                        color="text-blue-600"
                        trend={strategic.riskAppetiteConsumption > 80 ? "Critical" : "Healthy"}
                    />
                    <MetricCard
                        title="Critical Risks"
                        value={strategic.criticalRisksUnmitigated}
                        icon={ShieldAlert}
                        color="text-red-600"
                    />
                    <MetricCard
                        title="Control Health"
                        value={`${compliance.controlEffectiveness}%`}
                        icon={CheckCircle}
                        color="text-green-600"
                    />
                    <MetricCard
                        title="Vendor Risk"
                        value={supplyChain.avgCriticalVendorRisk}
                        icon={Truck}
                        color="text-orange-600"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {/* COLUMN 1: STRATEGY & RISK */}
                    <div className="space-y-2">
                        <DomainCard title="Strategy" icon={Activity} color="text-blue-600">
                            <div className="space-y-2">
                                <MetricRow label="Risk Velocity" value={strategic.riskVelocity > 0 ? `+${strategic.riskVelocity}` : strategic.riskVelocity} />
                                <div className="space-y-0.5">
                                    <div className="h-20">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={strategic.topRiskCategories} layout="vertical" margin={{ left: 30, right: 10 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 8 }} />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 2, 2, 0]} barSize={10} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </DomainCard>

                        <DomainCard title="Resilience" icon={Server} color="text-indigo-600">
                            <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                                <MiniStat label="MTTR" value={`${cyber.mttr}d`} />
                                <MiniStat label="Density" value={cyber.vulnDensity} />
                            </div>
                            <div className="space-y-1.5">
                                <MetricRow label="Vulnerabilities" value={cyber.openVulns} />
                                <div className="space-y-0.5">
                                    <div className="flex justify-between text-[8px] uppercase font-bold text-slate-400">
                                        <span>Asset Coverage</span>
                                        <span>{cyber.assetCriticalityCoverage}%</span>
                                    </div>
                                    <Progress value={cyber.assetCriticalityCoverage} className="h-1" />
                                </div>
                            </div>
                        </DomainCard>
                    </div>

                    {/* COLUMN 2: PEOPLE & SUPPLY CHAIN */}
                    <div className="space-y-2">
                        <DomainCard title="Culture" icon={Users} color="text-pink-600">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between p-1.5 bg-pink-50 rounded border border-pink-100">
                                    <span className="text-[10px] font-bold text-pink-900 uppercase">Human Error</span>
                                    <span className="text-base font-black text-pink-700">{culture.humanErrorCount}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <CircularMetric label="Policy" value={culture.policyAckRate} color="#db2777" />
                                    <CircularMetric label="Training" value={culture.trainingCompletionRate} color="#db2777" />
                                </div>
                            </div>
                        </DomainCard>

                        <DomainCard title="Supply Chain" icon={Truck} color="text-orange-600">
                            <div className="space-y-1.5">
                                <MetricRow label="Vendors" value={supplyChain.criticalVendors} />
                                <MetricRow label="Avg Risk" value={supplyChain.avgCriticalVendorRisk} />
                                <div className="space-y-0.5 pt-0.5">
                                    <div className="flex justify-between text-[8px] uppercase font-bold text-slate-400">
                                        <span>Assessments</span>
                                        <span>{supplyChain.vendorAssessmentCoverage}%</span>
                                    </div>
                                    <Progress value={supplyChain.vendorAssessmentCoverage} className="h-1 bg-orange-100" indicatorClassName="bg-orange-500" />
                                </div>
                            </div>
                        </DomainCard>
                    </div>

                    {/* COLUMN 3: COMPLIANCE & BCP */}
                    <div className="space-y-2">
                        <DomainCard title="Compliance" icon={FileCheck} color="text-green-600">
                            <div className="space-y-1.5">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div className="p-1 bg-slate-50 rounded border text-center">
                                        <div className="text-sm font-black text-slate-900">{compliance.totalControls}</div>
                                        <div className="text-[8px] text-slate-500 uppercase font-bold">Total</div>
                                    </div>
                                    <div className="p-1 bg-green-50 rounded border border-green-100 text-center">
                                        <div className="text-sm font-black text-green-700">{compliance.implementedControls}</div>
                                        <div className="text-[8px] text-green-600 uppercase font-bold">Impl.</div>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <Progress value={compliance.controlEffectiveness} className="h-1 bg-green-100" indicatorClassName="bg-green-600" />
                                    <p className="text-[8px] text-center font-bold text-slate-400 uppercase">Effective: {compliance.controlEffectiveness}%</p>
                                </div>
                            </div>
                        </DomainCard>

                        <DomainCard title="NIS2 & Privacy" icon={ShieldAlert} color="text-purple-600">
                            <div className="space-y-1.5">
                                <div className="p-1.5 bg-purple-50 rounded border border-purple-100 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-purple-800 uppercase">Timeliness</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-black text-purple-900">{ops.reportingTimeliness}%</span>
                                        <Progress value={ops.reportingTimeliness} className="w-12 h-1 bg-purple-200" indicatorClassName="bg-purple-600" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                    <MiniStat label="Significant" value={ops.significantIncidents} />
                                    <MiniStat label="Affected" value={ops.crossBorderIncidents} />
                                </div>

                                <div className="flex justify-between text-[9px] font-bold text-slate-500 px-1 pt-1 opacity-70 border-t border-slate-100">
                                    <span>Breach Det: {ops.avgBreachDetectionDays}d</span>
                                    <span>Notifiable: {ops.notifiableBreaches}</span>
                                </div>
                            </div>
                        </DomainCard>

                        <DomainCard title="BCP" icon={Zap} color="text-yellow-600">
                            <div className="flex items-center justify-between gap-3">
                                <MetricRow label="Projects" value={resilience.activeProjects} />
                                <div className="flex-1 space-y-0.5">
                                    <div className="flex justify-between text-[8px] font-bold uppercase text-slate-400">
                                        <span>BIA</span>
                                        <span>{resilience.biaCompletionRate}%</span>
                                    </div>
                                    <Progress value={resilience.biaCompletionRate} className="h-1 bg-yellow-100" indicatorClassName="bg-yellow-600" />
                                </div>
                            </div>
                        </DomainCard>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function MetricCard({ title, value, icon: Icon, color, trend }: any) {
    return (
        <Card className="shadow-none border-slate-100">
            <CardContent className="p-2">
                <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')} flex items-center justify-center ${color} shrink-0`}>
                        <Icon className="h-3 w-3" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 truncate">{title}</p>
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-black text-slate-900 leading-none">{value}</h3>
                            {trend && (
                                <span className={`text-[7px] font-black uppercase px-1 rounded-sm ${trend.includes('Critical') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {trend}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DomainCard({ title, icon: Icon, color, children }: any) {
    return (
        <Card className="h-full border-slate-100 shadow-none">
            <CardHeader className="py-1 px-2 border-b bg-slate-50/30 flex-row items-center gap-1.5 space-y-0">
                <Icon className={`h-3 w-3 ${color}`} />
                <CardTitle className="text-[9px] font-black uppercase tracking-widest text-slate-600">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
                {children}
            </CardContent>
        </Card>
    );
}

function MetricRow({ label, value }: any) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
            <span className="text-xs font-black text-slate-900">{value}</span>
        </div>
    );
}

function MiniStat({ label, value }: any) {
    return (
        <div className="p-1 rounded bg-slate-50/50 border border-slate-100 text-center">
            <div className="text-xs font-black text-slate-900 leading-none">{value}</div>
            <div className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{label}</div>
        </div>
    );
}

function CircularMetric({ label, value, color }: any) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter min-w-[30px]">{label}</span>
            <div className="flex-1 space-y-0.5">
                <Progress value={value} className="h-1" indicatorClassName={`bg-[${color}]`} style={{ '--progress-background': color } as any} />
                <div className="flex justify-end leading-none">
                    <span className="text-[7px] font-black text-slate-900">{value}%</span>
                </div>
            </div>
        </div>
    );
}
