import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@complianceos/ui";
import { trpc } from '@/lib/trpc';
import {
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Shield,
    Activity,
    Target,
    Zap,
    Brain,
    ArrowUpRight,
    AlertTriangle,
    TrendingDown,
    CheckSquare,
    Building2,
    Truck,
    BookOpen,
    LifeBuoy,
    Lock
} from "lucide-react";
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Tooltip
} from 'recharts';
import { calculateReadinessScore, generateRiskHeatmap, getAuditRiskAlerts, type ReadinessScore, type RiskHeatmapData } from '@/lib/readinessScoring';

interface ExecutiveDashboardProps {
    clientId: number;
    onViewFullAnalysis?: () => void;
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
    'Strategic': Target,
    'Strategic Risk': Target,
    'Cyber': Zap,
    'Cyber Security': Zap,
    'Culture': BookOpen,
    'Governance & Culture': BookOpen,
    'Supply Chain': Truck,
    'Compliance': Shield,
    'Regulatory Compliance': Shield,
    'Resilience': LifeBuoy,
    'Business Resilience': LifeBuoy,
};

const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-slate-700/60 shadow-2xl min-w-[220px] text-xs space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1.5">
                    <span className="font-bold text-sm text-slate-100">{item.fullDomain || item.subject}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.score >= 70 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        item.score >= 40 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                        {item.status}
                    </span>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                        <span>Current Maturity:</span>
                        <span className="font-extrabold text-brand-bright text-sm">{item.score}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                        <span>Target Baseline:</span>
                        <span className="font-semibold text-slate-300">{item.target}%</span>
                    </div>
                </div>
                {item.description && (
                    <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-300 leading-snug">
                        {item.description}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export const ExecutiveDashboard = ({ clientId, onViewFullAnalysis }: ExecutiveDashboardProps) => {
    const { data: dashboard, isLoading } = trpc.metrics.getDashboard.useQuery({ clientId });
    const [readinessScore, setReadinessScore] = useState<ReadinessScore | null>(null);
    const [riskHeatmap, setRiskHeatmap] = useState<RiskHeatmapData[]>([]);
    const [riskAlerts, setRiskAlerts] = useState<string[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const loadReadinessData = async () => {
            try {
                setIsRefreshing(true);
                const [score, heatmap] = await Promise.all([
                    calculateReadinessScore(clientId),
                    generateRiskHeatmap(clientId)
                ]);
                setReadinessScore(score);
                setRiskHeatmap(heatmap);
                setRiskAlerts(getAuditRiskAlerts(score, heatmap));
            } catch (error) {
                console.error('Failed to load readiness data:', error);
            } finally {
                setIsRefreshing(false);
            }
        };

        loadReadinessData();
        
        // Refresh every 5 minutes
        const interval = setInterval(loadReadinessData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [clientId]);

    if (isLoading || !readinessScore) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-slate-100 rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 h-[500px] bg-slate-100 rounded-xl" />
                    <div className="lg:col-span-2 h-[500px] bg-slate-100 rounded-xl" />
                </div>
            </div>
        );
    }

    const { strategic, cyber, culture, supplyChain, compliance, resilience } = (dashboard as any) || {};

    const maturityProfile = (dashboard as any)?.maturityProfile || [
        {
            domain: 'Strategic Risk',
            domainShort: 'Strategic',
            subject: 'Strategic',
            score: strategic?.score ?? 33,
            target: 85,
            status: (strategic?.score ?? 33) >= 70 ? 'Optimal' : (strategic?.score ?? 33) >= 40 ? 'Moderate' : 'Action Required',
            description: `${(strategic?.totalRisks || 24) - (strategic?.criticalRisksUnmitigated || 16)} of ${strategic?.totalRisks || 24} risks mitigated`
        },
        {
            domain: 'Cyber Security',
            domainShort: 'Cyber',
            subject: 'Cyber',
            score: cyber?.score ?? 50,
            target: 80,
            status: (cyber?.score ?? 50) >= 70 ? 'Optimal' : 'Remediation Needed',
            description: `${cyber?.openVulns || 100} open vulnerabilities across ${cyber?.totalAssets || 10} assets`
        },
        {
            domain: 'Governance & Culture',
            domainShort: 'Culture',
            subject: 'Culture',
            score: culture?.score ?? 70,
            target: 80,
            status: (culture?.score ?? 70) >= 70 ? 'Established' : 'In Progress',
            description: `${culture?.approvedPolicies || 70} of ${culture?.totalPolicies || 100} policies approved`
        },
        {
            domain: 'Supply Chain',
            domainShort: 'Supply Chain',
            subject: 'Supply Chain',
            score: supplyChain?.score ?? 90,
            target: 80,
            status: 'Controlled',
            description: `${supplyChain?.vendorAssessmentCoverage || 100}% vendor assessment coverage`
        },
        {
            domain: 'Regulatory Compliance',
            domainShort: 'Compliance',
            subject: 'Compliance',
            score: compliance?.controlImplementationRate ?? compliance?.controlEffectiveness ?? 24,
            target: 85,
            status: 'Gap Closure Required',
            description: `${compliance?.implementedControls || 16} of ${compliance?.totalControls || 68} controls implemented`
        },
        {
            domain: 'Business Resilience',
            domainShort: 'Resilience',
            subject: 'Resilience',
            score: resilience?.score ?? 100,
            target: 80,
            status: 'Robust',
            description: `${resilience?.recoveryDefinedProcesses || 4} of ${resilience?.totalProcesses || 4} processes with RTO/RPO defined`
        }
    ];

    const overallMaturity = (dashboard as any)?.overallMaturity ?? Math.round(
        maturityProfile.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / (maturityProfile.length || 1)
    );

    const radarChartData = maturityProfile.map((m: any) => ({
        subject: m.domainShort || m.subject,
        fullDomain: m.domain,
        score: m.score,
        target: m.target || 80,
        status: m.status,
        description: m.description,
        fullMark: 100
    }));

    const stats = [
        {
            label: "Compliance Posture",
            value: `${compliance?.controlImplementationRate ?? compliance?.controlEffectiveness ?? 0}%`,
            description: `${compliance?.implementedControls || 0} of ${compliance?.totalControls || 0} Controls Implemented`,
            badge: `${compliance?.inProgressControls || 0} In Progress`,
            icon: Shield,
            color: "text-brand",
            bg: "bg-brand/10",
        },
        {
            label: "Critical Risks",
            value: strategic?.criticalRisksUnmitigated || 0,
            description: `${strategic?.criticalRisksUnmitigated || 0} of ${strategic?.totalRisks || 0} Risks Unmitigated`,
            badge: "Action Required",
            icon: AlertCircle,
            color: "text-rose-600",
            bg: "bg-rose-50",
        },
        {
            label: "Open Vulnerabilities",
            value: cyber?.openVulns || 0,
            description: `Across ${cyber?.totalAssets || 0} Assets (Density: ${cyber?.vulnDensity || "0"})`,
            badge: "Patching Pending",
            icon: Zap,
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
        {
            label: "Business Resilience",
            value: `${resilience?.biaCompletionRate || 0}%`,
            description: `${resilience?.recoveryDefinedProcesses || 0} of ${resilience?.totalProcesses || 0} Processes with RTO/RPO`,
            badge: `${supplyChain?.vendorAssessmentCoverage || 0}% Vendors Assessed`,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        }
    ];

    return (
        <div className="space-y-8">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border border-slate-100 shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-105 duration-300`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    {stat.badge}
                                </span>
                            </div>
                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-slate-500">{stat.label}</h3>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stat.value}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 truncate">{stat.description}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Maturity Radar & Domain Breakdown */}
                <Card className="lg:col-span-3 border border-slate-100 shadow-sm bg-white overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-slate-100 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
                                    <Target className="w-5 h-5 text-brand" />
                                    Domain Maturity Profile
                                </CardTitle>
                                <p className="text-xs text-slate-500">
                                    Holistic governance assessment benchmarked against enterprise target baselines (80-85%).
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Composite Maturity:</span>
                                <Badge className="bg-brand text-white hover:bg-brand font-bold px-3 py-1 text-sm shadow-sm">
                                    {overallMaturity}%
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                        {/* Radar Chart */}
                        <div className="h-[360px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                                    <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <PolarRadiusAxis
                                        angle={30}
                                        domain={[0, 100]}
                                        ticks={[25, 50, 75, 100]}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        stroke="#cbd5e1"
                                    />
                                    <Radar
                                        name="Target Baseline"
                                        dataKey="target"
                                        stroke="#94a3b8"
                                        strokeDasharray="4 4"
                                        strokeWidth={1.5}
                                        fill="#94a3b8"
                                        fillOpacity={0.05}
                                    />
                                    <Radar
                                        name="Current Posture"
                                        dataKey="score"
                                        stroke="#1C4D8D"
                                        strokeWidth={2.5}
                                        fill="#3ABEF9"
                                        fillOpacity={0.35}
                                        dot={{ r: 4, fill: '#1C4D8D', stroke: '#ffffff', strokeWidth: 1.5 }}
                                    />
                                    <Tooltip content={<CustomRadarTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Chart Legend */}
                        <div className="flex items-center justify-center gap-6 py-2 text-xs text-slate-600 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-brand-bright border border-brand" />
                                <span className="font-semibold text-slate-700">Current Posture ({overallMaturity}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
                                <span className="text-slate-500">Enterprise Target Baseline (80-85%)</span>
                            </div>
                        </div>

                        {/* Domain Performance Breakdown Grid */}
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-brand" />
                                Domain Performance Breakdown
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {maturityProfile.map((domain: any, idx: number) => {
                                    const Icon = DOMAIN_ICONS[domain.subject] || Shield;
                                    const isHealthy = domain.score >= 70;
                                    const isModerate = domain.score >= 40 && domain.score < 70;
                                    return (
                                        <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${
                                                        isHealthy ? 'bg-emerald-100 text-emerald-700' :
                                                        isModerate ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-800">{domain.domain}</span>
                                                </div>
                                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                                                    isHealthy ? 'bg-emerald-100 text-emerald-800' :
                                                    isModerate ? 'bg-amber-100 text-amber-800' :
                                                    'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {domain.score}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mb-2">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-700 ${
                                                        isHealthy ? 'bg-emerald-500' :
                                                        isModerate ? 'bg-amber-500' :
                                                        'bg-rose-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, Math.max(5, domain.score))}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                <span className="truncate pr-2">{domain.description}</span>
                                                <span className="text-slate-400 font-medium shrink-0">Target: {domain.target}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Summary Sidebar */}
                <Card className="lg:col-span-2 border-none bg-gradient-to-br from-brand via-[#173f73] to-[#0f2a4f] text-white shadow-xl flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-white">
                            <Brain className="w-5 h-5 text-brand-bright" />
                            AI Posture Intelligence
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <h4 className="font-bold text-xs mb-2 text-brand-bright uppercase tracking-widest flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                    readinessScore.auditRisk === 'critical' ? 'bg-red-400' :
                                    readinessScore.auditRisk === 'high' ? 'bg-amber-400' :
                                    readinessScore.auditRisk === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'
                                } animate-pulse`} />
                                Executive Posture Summary · Audit Risk: {readinessScore.auditRisk.toUpperCase()}
                            </h4>
                            <p className="text-sm leading-relaxed text-slate-100">
                                Current composite domain maturity is <b>{overallMaturity}%</b>.
                                Control implementation is currently at <b>{compliance?.controlImplementationRate ?? compliance?.controlEffectiveness ?? 0}%</b> ({compliance?.implementedControls || 0} of {compliance?.totalControls || 0} controls).
                                While <b>Business Resilience</b> ({resilience?.biaCompletionRate || 0}%) and <b>Supply Chain</b> ({supplyChain?.vendorAssessmentCoverage || 0}%) are well controlled, remediation of <b>{strategic?.criticalRisksUnmitigated || 0} unmitigated critical risks</b> and <b>{cyber?.openVulns || 0} open vulnerabilities</b> is required to achieve audit readiness.
                                {' '}Overall audit readiness score: <b>{readinessScore.overall}%</b> (evidence coverage {readinessScore.evidenceCoverage}%, control implementation {readinessScore.controlImplementation}%).
                            </p>
                        </div>

                        {riskAlerts.length > 0 && (
                            <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-4 border border-red-400/30">
                                <h4 className="font-bold text-sm mb-2 text-red-100 uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Critical Alerts
                                </h4>
                                <div className="space-y-2">
                                    {riskAlerts.map((alert, index) => (
                                        <p key={index} className="text-sm text-red-100 leading-relaxed">
                                            • {alert}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200 flex items-center justify-between">
                                <span>Key Action Items</span>
                                <Badge variant="outline" className="text-white border-white/20 text-[10px]">
                                    Live Priorities
                                </Badge>
                            </h4>
                            {[
                                {
                                    text: `Remediate ${strategic?.criticalRisksUnmitigated || 0} unmitigated critical risks lacking treatment in the Risk Register.`,
                                    icon: AlertCircle,
                                    priority: 'High'
                                },
                                {
                                    text: `Implement ${compliance?.notImplementedControls || 49} pending controls to advance SOC 2 and ISO 27001 readiness.`,
                                    icon: Shield,
                                    priority: 'High'
                                },
                                {
                                    text: `Address ${cyber?.openVulns || 0} open vulnerabilities detected across ${cyber?.totalAssets || 0} inventoried assets.`,
                                    icon: Zap,
                                    priority: 'Medium'
                                },
                                {
                                    text: `Finalize review and formal approval for ${culture?.totalPolicies - (culture?.approvedPolicies || 0) || 30} policies pending sign-off.`,
                                    icon: CheckCircle2,
                                    priority: 'Medium'
                                }
                            ].map((rec, i) => (
                                <div key={i} className="flex gap-3 items-start group bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-colors">
                                    <div className="mt-0.5 p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors text-brand-bright">
                                        <rec.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-100 leading-relaxed">{rec.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 mt-auto">
                            <button
                                onClick={onViewFullAnalysis}
                                className="w-full py-3.5 bg-white text-brand hover:bg-brand-bright hover:text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 group"
                            >
                                <TrendingUp className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                Open Report Workshop & Generator
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
