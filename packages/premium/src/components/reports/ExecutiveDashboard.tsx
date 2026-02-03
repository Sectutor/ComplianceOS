
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@complianceos/ui/ui/alert";
import { ShieldCheck, AlertTriangle, TrendingUp, CheckCircle, Activity } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface ExecutiveDashboardProps {
    clientId: number;
}

export const ExecutiveDashboard = ({ clientId }: ExecutiveDashboardProps) => {
    // Fetch data from existing dashboard router
    const { data: stats, isLoading } = trpc.dashboard.enhanced.useQuery();
    const { data: insights } = trpc.dashboard.getInsights.useQuery();

    // Mock Compliance Score (replace with real if available)
    const complianceScore = 78;

    if (isLoading) return <div className="p-8 text-center text-slate-500">Loading executive metrics...</div>;

    // Data for Risk Chart
    const riskData = [
        { name: 'High', value: stats?.overview.highRisks || 0, color: '#ef4444' },
        { name: 'Medium', value: (stats?.overview.totalRisks || 0) - (stats?.overview.highRisks || 0), color: '#fbbf24' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Compliance Score Card */}
                <Card className="border-t-4 border-t-blue-600 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Overall Compliance Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div className="text-4xl font-bold text-slate-900">{complianceScore}%</div>
                            <div className="flex items-center text-green-600 text-sm font-medium">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +12% vs last month
                            </div>
                        </div>
                        <Progress value={complianceScore} className="h-2 mt-4 bg-slate-100" />
                        <p className="text-xs text-slate-500 mt-2">Target: 85% by Q4</p>
                    </CardContent>
                </Card>

                {/* Risk Exposure Card */}
                <Card className="border-t-4 border-t-red-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Critical Risk Exposure</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                        <div>
                            <div className="text-4xl font-bold text-slate-900">{stats?.overview.highRisks || 0}</div>
                            <p className="text-sm text-slate-500 mt-1">High/Critical Risks</p>
                        </div>
                        <div className="h-[60px] w-[60px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={riskData}
                                        dataKey="value"
                                        innerRadius={20}
                                        outerRadius={28}
                                        paddingAngle={2}
                                    >
                                        {riskData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Implementation Velocity */}
                <Card className="border-t-4 border-t-green-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Controls Implemented</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between">
                            <div className="text-4xl font-bold text-slate-900">
                                {stats?.controlsByStatus.implemented || 0}
                                <span className="text-lg text-slate-400 font-normal ml-1">/ {stats?.overview.totalControls}</span>
                            </div>
                            <ShieldCheck className="w-8 h-8 text-green-100 text-slate-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <div className="text-xs text-slate-500">
                                <span className="block font-semibold text-slate-700">{stats?.controlsByStatus.inProgress || 0}</span>
                                In Progress
                            </div>
                            <div className="text-xs text-slate-500">
                                <span className="block font-semibold text-slate-700">
                                    {Math.round(((stats?.controlsByStatus.implemented || 0) / (stats?.overview.totalControls || 1)) * 100)}%
                                </span>
                                Completion Rate
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* AI Insights Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            Executive Insights
                        </CardTitle>
                        <CardDescription>
                            AI-driven analysis of your compliance posture and recommended actions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {insights?.map((insight: any) => (
                            <Alert key={insight.id} className={`
                                ${insight.type === 'critical' ? 'border-red-200 bg-red-50' :
                                    insight.type === 'warning' ? 'border-amber-200 bg-amber-50' :
                                        'border-blue-200 bg-blue-50'}
                            `}>
                                <div className="flex items-start gap-4">
                                    {insight.type === 'critical' ? <AlertTriangle className="h-5 w-5 text-red-600" /> :
                                        insight.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-amber-600" /> :
                                            <CheckCircle className="h-5 w-5 text-blue-600" />}

                                    <div className="flex-1">
                                        <AlertTitle className={`
                                            ${insight.type === 'critical' ? 'text-red-900' :
                                                insight.type === 'warning' ? 'text-amber-900' :
                                                    'text-blue-900'} font-semibold mb-1
                                        `}>
                                            {insight.title}
                                        </AlertTitle>
                                        <AlertDescription className="text-slate-600 text-sm">
                                            {insight.description}
                                        </AlertDescription>
                                        <div className="mt-2">
                                            <Button size="sm" variant="link" className="p-0 h-auto font-semibold text-slate-900 hover:underline">
                                                {insight.action} &rarr;
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Alert>
                        ))}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                    <CardHeader>
                        <CardTitle className="text-base">Strategic Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                            <h4 className="font-medium text-slate-900 text-sm">Schedule Quarterly Review</h4>
                            <p className="text-xs text-slate-500 mt-1">Prepare deck for board meeting</p>
                        </div>
                        <div className="p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                            <h4 className="font-medium text-slate-900 text-sm">Review Acceptable Use Policy</h4>
                            <p className="text-xs text-slate-500 mt-1">Pending approval from legal</p>
                        </div>
                        <div className="p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors cursor-pointer">
                            <h4 className="font-medium text-slate-900 text-sm">Approve Implementations</h4>
                            <p className="text-xs text-slate-500 mt-1">3 new controls ready for review</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
