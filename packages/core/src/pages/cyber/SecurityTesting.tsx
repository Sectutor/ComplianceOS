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
import { SecurityTestingPanels } from "./SecurityTestingPanels";

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
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
            case 'in_progress': return <Activity className="w-5 h-5 text-sky-500 dark:text-sky-400 animate-pulse" />;
            case 'scheduled': return <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
            default: return <Clock className="w-5 h-5 text-muted-foreground" />;
        }
    };

    const getTypeColor = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('red team')) return 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400';
        if (t.includes('pentest')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400';
        if (t.includes('scan')) return 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400';
        return 'bg-muted text-muted-foreground border-border';
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
                    <Link href={`/clients/${clientId}/cyber`} className="text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 mb-2">
                        <Shield className="w-3 h-3" /> Cyber Resilience Dashboard
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-3">
                        Security Testing & Exercises
                        <Badge variant="error" className="border-none font-black text-[10px] tracking-widest px-3 py-1">
                            ART. 21 COMPLIANT
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                        Schedule, track, and remediate findings from systemic security audits and red team exercises.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleScheduleTest}
                        disabled={scheduleMutation.isLoading}
                        className="rounded-2xl h-12 px-6 font-bold shadow-sm flex items-center gap-2"
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
                        color: 'text-sky-600 dark:text-sky-400',
                        bg: 'bg-sky-500/10'
                    },
                    {
                        label: 'Unresolved High/Crit',
                        value: health?.unresolvedCount.toString() || '0',
                        icon: Flame,
                        color: 'text-red-600 dark:text-red-400',
                        bg: 'bg-red-500/10'
                    },
                    {
                        label: 'Compliance Health',
                        value: (health?.score || 0).toString() + '%',
                        icon: ShieldCheck,
                        color: health?.score && health.score > 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                        bg: health?.score && health.score > 80 ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                    },
                    {
                        label: 'Total Findings',
                        value: health?.findingsCount.toString() || '0',
                        icon: Target,
                        color: 'text-blue-600 dark:text-blue-400',
                        bg: 'bg-blue-500/10'
                    },
                ].map((stat, i) => (
                    <Card key={i} className="border-border shadow-sm rounded-xl overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                    <p className="text-2xl font-black text-foreground tracking-tighter">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Testing Timeline / List */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-border shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-black text-foreground">Testing Log</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="rounded-xl font-bold bg-muted text-muted-foreground px-4">
                                        <Filter className="w-4 h-4 mr-2" /> All Types
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {(!tests || tests.length === 0) && (
                                <div className="p-12 text-center space-y-4">
                                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                                        <Target className="w-10 h-10 text-muted-foreground/40" />
                                    </div>
                                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs tracking-tighter">No test logs found</p>
                                    <Button variant="outline" onClick={handleScheduleTest} className="rounded-2xl font-black text-[10px] tracking-widest">
                                        INITIALIZE FIRST SCAN
                                    </Button>
                                </div>
                            )}

                            {tests?.map((test) => (
                                <div key={test.id} className="p-8 border-t border-border flex items-center justify-between group hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-muted/40 border border-border shadow-sm shrink-0">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase">
                                                {test.scheduledDate ? format(new Date(test.scheduledDate), 'MMM') : 'TBD'}
                                            </span>
                                            <span className="text-xl font-black text-foreground leading-none">
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
                                            <h3 className="text-lg font-black text-foreground tracking-tight group-hover:text-primary transition-colors">{test.title}</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)]" />
                                                    <span className="text-[11px] font-bold text-muted-foreground">{test.findingsCount || 0} Findings</span>
                                                </div>
                                                <span className="text-muted-foreground/60">•</span>
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                                                    <Target className="w-3 h-3" /> {test.notes || 'Systemic Scope'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {test.reportUrl && (
                                            <Button variant="outline" className="rounded-xl font-black text-[10px] tracking-widest px-4 border-border">
                                                DOWNLOAD REPORT
                                            </Button>
                                        )}
                                        <Button className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center p-0">
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
                    <Card className="border-none shadow-sm rounded-xl bg-primary text-primary-foreground overflow-hidden p-10 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="relative z-10 space-y-6">
                            <ShieldCheck className="w-12 h-12 text-primary-foreground/80" />
                            <div>
                                <h3 className="text-2xl font-black tracking-tighter mb-2">NIS2 Testing Mandate</h3>
                                <p className="text-primary-foreground/70 font-medium leading-relaxed text-sm">
                                    Article 21(2) requiring coordinated security exercises. Organizations must not only
                                    detect but proactively test their defense mechanisms.
                                </p>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-primary-foreground/20">
                                {[
                                    { text: 'Annual Penetration Tests', checked: true },
                                    { text: 'Quarterly Scenario Exercises', checked: false },
                                    { text: 'Monthly Exposure Scans', checked: true },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        {item.checked ? <CheckCircle2 className="w-5 h-5 text-primary-foreground/80" /> : <Clock className="w-5 h-5 text-primary-foreground/60" />}
                                        <span className="text-sm font-bold">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <Card className="border-border shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black text-foreground flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                Red Team Scenarios
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-4">
                            {[
                                { title: 'Supply Chain Breach', desc: 'Simulate a compromise of a Tier 1 software vendor.' },
                                { title: 'Insider Data Exfiltration', desc: 'Simulate an authorized user attempting mass download.' },
                                { title: 'DDoS Resilience', desc: 'Testing edge defense against 1Tbps+ volumetric bursts.' }
                            ].map((s, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-muted hover:bg-muted/70 transition-colors cursor-pointer border border-transparent hover:border-border">
                                    <h4 className="font-black text-foreground text-sm mb-1">{s.title}</h4>
                                    <p className="text-[11px] text-muted-foreground font-medium leading-normal">{s.desc}</p>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full rounded-2xl font-black text-[10px] tracking-widest text-primary hover:text-primary hover:bg-accent">
                                VIEW ALL SCENARIOS
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* NIS2 Advanced Security Testing (ENISA Measure 6.7 / Art. 21(2)(e)) */}
            <SecurityTestingPanels clientId={clientId} />
        </div>
    );
}

export default SecurityTesting;
