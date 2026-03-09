
import React, { useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Activity, ShieldCheck, AlertCircle, Clock, Search, Bell, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { Link } from "wouter";

export default function CyberMonitoring() {
    const { selectedClientId } = useClientContext();

    const kriData = [
        {
            name: "Unpatched Critical Vulnerabilities",
            value: 42,
            target: 0,
            status: 'critical',
            trend: 'up',
            change: '+12%',
            category: 'Vulnerability Management'
        },
        {
            name: "MFA Adoption (Admin Users)",
            value: 100,
            target: 100,
            status: 'healthy',
            trend: 'stable',
            change: '0%',
            category: 'Access Control'
        },
        {
            name: "Backup Success Rate",
            value: 98.5,
            target: 100,
            status: 'warning',
            trend: 'down',
            change: '-0.5%',
            category: 'Cyber Resilience'
        },
        {
            name: "Supplier Risk Score (Avg)",
            value: 72,
            target: 85,
            status: 'warning',
            trend: 'down',
            change: '-4%',
            category: 'Supply Chain'
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-700 max-w-[1400px] mx-auto p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <Link to={`/clients/${selectedClientId}/cyber`} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-sky-600 transition-colors flex items-center gap-2 mb-2">
                             <Activity className="w-3 h-3" /> Cyber Resilience Dashboard
                        </Link>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                            Continuous Monitoring
                            <Badge className="bg-[#3ABEF9] text-white border-none font-black text-[10px] tracking-widest px-3 py-1">
                                REAL-TIME KRI FEED
                            </Badge>
                        </h1>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed">
                            Live tracking of Key Risk Indicators (KRIs) as required by NIS2 Article 21 effectiveness assessments.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Badge variant="outline" className="h-12 px-6 rounded-xl border-slate-200 bg-white shadow-sm flex items-center gap-2 text-slate-600 font-bold">
                             <Clock className="w-4 h-4 text-sky-500" /> Last Scan: Just Now
                        </Badge>
                        <button className="h-12 w-12 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 hover:text-sky-600 transition-all active:scale-90">
                            <Bell className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Status Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-[#3ABEF9]/20 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700" />
                        <ShieldCheck className="w-10 h-10 text-[#3ABEF9] mb-6" />
                        <div className="text-4xl font-black mb-2">84.2%</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Overall Security Posture Score</div>
                    </div>
                    
                    <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div className="text-xs font-black text-rose-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                ACTION REQUIRED <ArrowUpRight className="w-3 h-3" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-slate-900 mb-1">12</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Active Compliance Gaps</div>
                        </div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
                         <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-6">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-slate-900 mb-1">24m 12s</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Avg Incident Discovery Time</div>
                        </div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
                         <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                            <Search className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-slate-900 mb-1">99.9%</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Uptime (Critical ICT Assets)</div>
                        </div>
                    </div>
                </div>

                {/* KRI Detail List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Key Risk Indicators (KRIs)</h2>
                        <div className="flex gap-2">
                            <Badge className="bg-slate-100 text-slate-600 border-none font-bold">ALL SYSTEMS OPERATIONAL</Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {kriData.map((kri, idx) => (
                            <Card key={idx} className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-slate-200/50 group">
                                <CardContent className="p-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black text-slate-900 leading-tight">{kri.name}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kri.category}</p>
                                        </div>
                                        <div className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                                            kri.status === 'healthy' ? "bg-emerald-50 text-emerald-600" :
                                            kri.status === 'warning' ? "bg-amber-50 text-amber-600" :
                                            "bg-rose-50 text-rose-600"
                                        )}>
                                            {kri.status} Posture
                                        </div>
                                    </div>

                                    <div className="flex items-end gap-6 mb-8">
                                        <div className="text-5xl font-black text-slate-900 tracking-tighter">
                                            {kri.value}{kri.name.includes('%') ? '' : ''}
                                            {kri.name.includes('%') && <span className="text-2xl font-bold ml-1 opacity-40">%</span>}
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1 text-sm font-black mb-2",
                                            kri.trend === 'up' && kri.status === 'critical' ? 'text-rose-500' :
                                            kri.trend === 'down' && kri.status === 'healthy' ? 'text-emerald-500' :
                                            'text-slate-400'
                                        )}>
                                            {kri.trend === 'up' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                            {kri.change}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <span>Current Performance</span>
                                            <span>Target: {kri.target}{kri.name.includes('%') ? '%' : ''}</span>
                                        </div>
                                        <Progress 
                                            value={Math.min(100, (kri.value / (kri.target || 100)) * 100)} 
                                            className={cn(
                                                "h-3 rounded-full bg-slate-50",
                                                kri.status === 'critical' ? "[&>div]:bg-rose-500" :
                                                kri.status === 'warning' ? "[&>div]:bg-amber-500" :
                                                "[&>div]:bg-emerald-500"
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Active Alerts */}
                <Card className="border-none shadow-2xl shadow-rose-200/20 rounded-[3rem] bg-white ring-1 ring-rose-100 overflow-hidden">
                    <CardHeader className="bg-rose-50/50 p-10 border-b border-rose-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
                                    <Bell className="w-6 h-6 animate-ring" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black text-slate-900">Active Compliance Alerts</CardTitle>
                                    <p className="text-slate-500 font-medium text-sm">Real-time triggers based on KRI thresholds.</p>
                                </div>
                            </div>
                            <Badge className="bg-rose-100 text-rose-700 border-none font-black px-4 py-1.5">3 CRITICAL EVENTS</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-rose-50">
                            <div className="p-8 flex items-center justify-between hover:bg-rose-50/30 transition-colors">
                                <div className="flex gap-6 items-center">
                                    <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                    <div>
                                        <h4 className="font-black text-slate-900 leading-none mb-2">New Supply Chain Dependency Detected</h4>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">Source: AWS CloudWatch Integration • 12m ago</p>
                                    </div>
                                </div>
                                <button className="text-rose-600 font-black text-xs uppercase tracking-widest hover:underline">Review Asset Group</button>
                            </div>
                            <div className="p-8 flex items-center justify-between hover:bg-rose-50/30 transition-colors">
                                <div className="flex gap-6 items-center">
                                    <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                    <div>
                                        <h4 className="font-black text-slate-900 leading-none mb-2">Unauthorized Admin Access Attempt</h4>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-60">Source: Azure AD / Sentinel • 45m ago</p>
                                    </div>
                                </div>
                                <button className="text-rose-600 font-black text-xs uppercase tracking-widest hover:underline">Initiate Incident Report</button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
