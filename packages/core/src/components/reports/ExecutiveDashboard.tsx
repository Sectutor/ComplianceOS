import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@complianceos/ui";
import { trpc } from '@/lib/trpc';
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    TrendingUp,
    Shield,
    Activity,
    Target,
    Zap,
    Brain,
    ArrowUpRight,
    AlertTriangle,
    TrendingDown,
    CheckSquare
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Cell,
    PieChart,
    Pie,
    ScatterChart,
    Scatter,
    ZAxis
} from 'recharts';
import { calculateReadinessScore, generateRiskHeatmap, getAuditRiskAlerts, type ReadinessScore, type RiskHeatmapData } from '@/lib/readinessScoring';

interface ExecutiveDashboardProps {
    clientId: number;
    onViewFullAnalysis?: () => void;
}

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-slate-100 rounded-xl" />
                ))}
            </div>
        );
    }

    const { strategic, cyber, culture, supplyChain, compliance, resilience } = (dashboard as any) || {};

    // Data for Domain Maturity Radar
    const radarData = [
        { subject: 'Strategic', A: strategic?.riskAppetiteConsumption ? 100 - strategic.riskAppetiteConsumption : 0, fullMark: 100 },
        { subject: 'Cyber', A: cyber?.assetCriticalityCoverage || 0, fullMark: 100 },
        { subject: 'Culture', A: culture?.policyAckRate || 0, fullMark: 100 },
        { subject: 'Supply Chain', A: 100 - (supplyChain?.avgCriticalVendorRisk || 0), fullMark: 100 },
        { subject: 'Compliance', A: compliance?.controlEffectiveness || 0, fullMark: 100 },
        { subject: 'Resilience', A: resilience?.biaCompletionRate || 0, fullMark: 100 },
    ];

    const stats = [
        {
            label: "Readiness Score",
            value: `${readinessScore.overall}%`,
            description: "Overall audit readiness",
            icon: readinessScore.overall >= 80 ? CheckSquare : readinessScore.overall >= 60 ? AlertCircle : AlertTriangle,
            bg: readinessScore.overall >= 80 ? "bg-emerald-100" : readinessScore.overall >= 60 ? "bg-amber-100" : "bg-red-100",
            color: readinessScore.overall >= 80 ? "text-emerald-600" : readinessScore.overall >= 60 ? "text-amber-600" : "text-red-600",
            trend: readinessScore.overall >= 80 ? "Excellent" : readinessScore.overall >= 60 ? "Needs Work" : "Critical"
        },
        {
            label: "Evidence Coverage",
            value: `${readinessScore.evidenceCoverage}%`,
            description: "Controls with evidence",
            icon: CheckCircle2,
            bg: readinessScore.evidenceCoverage >= 80 ? "bg-emerald-100" : readinessScore.evidenceCoverage >= 60 ? "bg-amber-100" : "bg-red-100",
            color: readinessScore.evidenceCoverage >= 80 ? "text-emerald-600" : readinessScore.evidenceCoverage >= 60 ? "text-amber-600" : "text-red-600",
            trend: readinessScore.evidenceCoverage >= 80 ? "Strong" : readinessScore.evidenceCoverage >= 60 ? "Moderate" : "Weak"
        },
        {
            label: "Risk Appetite",
            value: strategic?.riskAppetiteConsumption ? `${100 - strategic.riskAppetiteConsumption}%` : "0%",
            description: "Remaining risk capacity",
            icon: Shield,
            bg: "bg-blue-100",
            color: "text-blue-600",
            trend: "+2.5%"
        },
        {
            label: "Control Effectiveness",
            value: `${readinessScore.controlImplementation}%`,
            description: "Controls implemented",
            icon: Target,
            bg: readinessScore.controlImplementation >= 80 ? "bg-emerald-100" : readinessScore.controlImplementation >= 60 ? "bg-amber-100" : "bg-red-100",
            color: readinessScore.controlImplementation >= 80 ? "text-emerald-600" : readinessScore.controlImplementation >= 60 ? "text-amber-600" : "text-red-600",
            trend: readinessScore.controlImplementation >= 80 ? "Strong" : readinessScore.controlImplementation >= 60 ? "Moderate" : "Weak"
        }
    ];

    return (
        <div className="space-y-8">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-md bg-white overflow-hidden group hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                                    Live <Activity className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-slate-500">{stat.label}</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                                    <span className="text-xs font-semibold text-emerald-600 flex items-center">
                                        <ArrowUpRight className="w-3 h-3" />
                                        {stat.trend.includes('%') ? stat.trend.split(' ')[0] : ''}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Risk Heatmap */}
                <Card className="lg:col-span-3 border-none shadow-md bg-white overflow-hidden">
                    <CardHeader className="border-b border-slate-50 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Risk Heatmap
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart
                                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="framework" 
                                        type="category"
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis 
                                        dataKey="controlName" 
                                        type="category"
                                        width={120}
                                    />
                                    <ZAxis 
                                        dataKey="riskLevel"
                                        range={[100, 400]}
                                        domain={['low', 'medium', 'high', 'critical']}
                                    />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ payload }) => {
                                            if (!payload || !payload.length) return null;
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 rounded-lg shadow-lg border">
                                                    <p className="font-semibold">{data.controlName}</p>
                                                    <p className="text-sm">Framework: {data.framework}</p>
                                                    <p className="text-sm">Risk: {data.riskLevel}</p>
                                                    <p className="text-sm">Evidence: {data.evidenceStatus}</p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Scatter
                                        name="Risk Level"
                                        data={riskHeatmap}
                                        fill={({ riskLevel }) => {
                                            switch (riskLevel) {
                                                case 'critical': return '#dc2626';
                                                case 'high': return '#ea580c';
                                                case 'medium': return '#f59e0b';
                                                case 'low': return '#22c55e';
                                                default: return '#6b7280';
                                            }
                                        }}
                                    />
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Summary Sidebar */}
                <Card className="lg:col-span-2 border-none bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="w-5 h-5 text-indigo-200" />
                            AI Posture Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <h4 className="font-bold text-sm mb-1 text-indigo-100 uppercase tracking-widest flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                    readinessScore.auditRisk === 'critical' ? 'bg-red-400' :
                                    readinessScore.auditRisk === 'high' ? 'bg-amber-400' :
                                    readinessScore.auditRisk === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'
                                } animate-pulse`} />
                                Audit Risk: {readinessScore.auditRisk.toUpperCase()}
                            </h4>
                            <p className="text-sm leading-relaxed text-indigo-50">
                                Overall readiness score: <b>{readinessScore.overall}%</b>.
                                {readinessScore.overall >= 80 ? 'Excellent position for upcoming audits.' :
                                 readinessScore.overall >= 60 ? 'Moderate readiness - some areas need attention.' :
                                 'Critical readiness - immediate action required.'}
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
                            <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-200">Key Recommendations</h4>
                            {[
                                { text: "Perform BIA for 3 critical business processes.", icon: CheckCircle2 },
                                { text: "Remediate high-velocity vulnerabilities in Finance assets.", icon: Zap },
                                { text: "Complete ISO 27001 readiness assessment.", icon: Target }
                            ].map((rec, i) => (
                                <div key={i} className="flex gap-3 items-start group">
                                    <div className="mt-1 p-1 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                        <rec.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm text-indigo-50">{rec.text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 mt-auto">
                            <button
                                onClick={onViewFullAnalysis}
                                className="w-full py-3 bg-white text-indigo-700 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                            >
                                <TrendingUp className="w-4 h-4" />
                                View Full Analysis
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
