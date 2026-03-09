import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { PageGuide } from '@/components/PageGuide';
import { Button } from '@complianceos/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import {
    Activity,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Calendar,
    FileText,
    ExternalLink,
    Plus,
    Flame,
    Zap,
    Target,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

export function SecurityTesting() {
    const params = useParams();
    const clientId = parseInt(params.id || '0');
    const [filterType, setFilterType] = useState<string>('all');
    
    const { data: tests, refetch } = trpc.securityTesting.getTests.useQuery({ clientId });
    const { data: health } = trpc.securityTesting.getComplianceHealth.useQuery({ clientId });

    const scheduleMutation = trpc.securityTesting.scheduleTest.useMutation({
        onSuccess: () => {
            toast.success("Security test scheduled successfully");
            refetch();
        }
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'in_progress': return <Activity className="w-5 h-5 text-sky-500 animate-pulse" />;
            case 'scheduled': return <Clock className="w-5 h-5 text-amber-500" />;
            default: return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getTypeColor = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('red team')) return 'bg-rose-50 text-rose-600 border-rose-100';
        if (t.includes('pentest')) return 'bg-indigo-50 text-indigo-600 border-indigo-100';
        if (t.includes('scan')) return 'bg-sky-50 text-sky-600 border-sky-100';
        return 'bg-slate-50 text-slate-600 border-slate-100';
    };

    const handleScheduleTest = () => {
        scheduleMutation.mutate({
            clientId,
            title: "New Security Exercise",
            type: "Pentest",
            scheduledDate: new Date().toISOString()
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-1000">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <Link href={`/clients/${clientId}/cyber`} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-sky-600 transition-colors flex items-center gap-2 mb-2">
                         <Shield className="w-3 h-3" /> Cyber Resilience Dashboard
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                        Security Testing & Exercises
                        <Badge className="bg-rose-600 text-white border-none font-black text-[10px] tracking-widest px-3 py-1">
                            ART. 21 COMPLIANT
                        </Badge>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        Schedule, track, and remediate findings from systemic security audits and red team exercises.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={handleScheduleTest}
                        disabled={scheduleMutation.isLoading}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-12 px-6 font-bold shadow-xl shadow-slate-200 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Schedule New Test
                    </Button>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { 
                        label: 'Active Exercises', 
                        value: tests?.filter(t => t.status === 'in_progress').length.toString() || '0', 
                        icon: Activity, 
                        color: 'text-sky-600', 
                        bg: 'bg-sky-50' 
                    },
                    { 
                        label: 'Unresolved High/Crit', 
                        value: health?.unresolvedCount.toString() || '0', 
                        icon: Flame, 
                        color: 'text-rose-600', 
                        bg: 'bg-rose-50' 
                    },
                    { 
                        label: 'Compliance Health', 
                        value: (health?.score || 0).toString() + '%', 
                        icon: ShieldCheck, 
                        color: health?.score && health.score > 80 ? 'text-emerald-600' : 'text-amber-600', 
                        bg: health?.score && health.score > 80 ? 'bg-emerald-50' : 'bg-amber-50' 
                    },
                    { 
                        label: 'Total Findings', 
                        value: health?.findingsCount.toString() || '0', 
                        icon: Target, 
                        color: 'text-indigo-600', 
                        bg: 'bg-indigo-50' 
                    },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-lg shadow-slate-100 rounded-3xl overflow-hidden ring-1 ring-slate-100">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Testing Timeline / List */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-black text-slate-900">Testing Log</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="rounded-xl font-bold bg-slate-50 text-slate-500 px-4">
                                        <Filter className="w-4 h-4 mr-2" /> All Types
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {(!tests || tests.length === 0) && (
                                <div className="p-12 text-center space-y-4">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                        <Target className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs tracking-tighter">No test logs found</p>
                                    <Button variant="outline" onClick={handleScheduleTest} className="rounded-2xl font-black text-[10px] tracking-widest">
                                        INITIALIZE FIRST SCAN
                                    </Button>
                                </div>
                            )}

                            {tests?.map((test) => (
                                <div key={test.id} className="p-8 border-t border-slate-50 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm shrink-0">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">
                                                {test.scheduledDate ? format(new Date(test.scheduledDate), 'MMM') : 'TBD'}
                                            </span>
                                            <span className="text-xl font-black text-slate-900 leading-none">
                                                {test.scheduledDate ? format(new Date(test.scheduledDate), 'dd') : '??'}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={cn("text-[8px] font-black tracking-widest px-2 py-0.5", getTypeColor(test.type))}>
                                                    {test.type.toUpperCase()}
                                                </Badge>
                                                {getStatusIcon(test.status || 'scheduled')}
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-sky-600 transition-colors">{test.title}</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    <span className="text-[11px] font-bold text-slate-500">{test.findingsCount || 0} Findings</span>
                                                </div>
                                                <span className="text-slate-300">•</span>
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                                    <Target className="w-3 h-3" /> {test.notes || 'Systemic Scope'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {test.reportUrl && (
                                            <Button variant="outline" className="rounded-xl font-black text-[10px] tracking-widest px-4 border-slate-200">
                                                DOWNLOAD REPORT
                                            </Button>
                                        )}
                                        <Button className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center p-0">
                                            <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Info / Guide Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-2xl shadow-indigo-100 rounded-[2.5rem] bg-indigo-600 text-white overflow-hidden p-10 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="relative z-10 space-y-6">
                            <ShieldCheck className="w-12 h-12 text-indigo-200" />
                            <div>
                                <h3 className="text-2xl font-black tracking-tighter mb-2">NIS2 Testing Mandate</h3>
                                <p className="text-indigo-100 font-medium leading-relaxed text-sm">
                                    Article 21(2) requiring coordinated security exercises. Organizations must not only 
                                    detect but proactively test their defense mechanisms.
                                </p>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-indigo-500/50">
                                {[
                                    { text: 'Annual Penetration Tests', checked: true },
                                    { text: 'Quarterly Scenario Exercises', checked: false },
                                    { text: 'Monthly Exposure Scans', checked: true },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        {item.checked ? <CheckCircle2 className="w-5 h-5 text-indigo-300" /> : <Clock className="w-5 h-5 text-indigo-400" />}
                                        <span className="text-sm font-bold">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" />
                                Red Team Scenarios
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            {[
                                { title: 'Supply Chain Breach', desc: 'Simulate a compromise of a Tier 1 software vendor.' },
                                { title: 'Insider Data Exfiltration', desc: 'Simulate an authorized user attempting mass download.' },
                                { title: 'DDoS Resilience', desc: 'Testing edge defense against 1Tbps+ volumetric bursts.' }
                            ].map((s, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                                    <h4 className="font-black text-slate-900 text-sm mb-1">{s.title}</h4>
                                    <p className="text-[11px] text-slate-500 font-medium leading-normal">{s.desc}</p>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full rounded-2xl font-black text-[10px] tracking-widest text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                VIEW ALL SCENARIOS
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default SecurityTesting;

export default SecurityTesting;
