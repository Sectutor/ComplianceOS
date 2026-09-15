import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Progress } from '@complianceos/ui/ui/progress';
import {
    CalendarClock,
    ArrowRight,
    CheckCircle2,
    Shield,
    Sparkles,
    Lock,
    ExternalLink,
    Clock,
    Award
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface FastTrackFrameworkConfig {
    id: string;
    title: string;
    badge: string;
    tagline: string;
    route: string;
    accentColor: string;
    badgeColor: string;
    progressColor: string;
}

const FRAMEWORKS: FastTrackFrameworkConfig[] = [
    {
        id: 'nis2',
        title: 'NIS2 Directive',
        badge: 'EU 2022/2555 • Critical Infra',
        tagline: 'All-hazards risk, Art 21 security measures, & 24h CSIRT rapid notification.',
        route: '/nis2',
        accentColor: 'border-amber-200 hover:border-amber-400 bg-gradient-to-br from-amber-50/40 to-orange-50/20',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        progressColor: 'bg-amber-600',
    },
    {
        id: 'iso27001',
        title: 'ISO/IEC 27001:2022',
        badge: 'Global ISMS Benchmark',
        tagline: 'ISMS scope, threat modeling, Annex A 93 controls, and stage 1/2 clean room.',
        route: '/iso27001/program-guide',
        accentColor: 'border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50/40 to-indigo-50/20',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        progressColor: 'bg-blue-600',
    },
    {
        id: 'dora',
        title: 'DORA Resilience',
        badge: 'EU 2022/2554 • Finance',
        tagline: 'ICT governance, TLPT resilience testing, major incident SLAs, and TPRM registers.',
        route: '/dora',
        accentColor: 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-emerald-50/40 to-teal-50/20',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        progressColor: 'bg-emerald-600',
    },
    {
        id: 'gdpr',
        title: 'GDPR & EU Privacy',
        badge: 'EU 2016/679 • Privacy',
        tagline: 'Art 30 ROPA, 30-day DSAR SLAs, transfer impact assessments, and DPIA risk models.',
        route: '/privacy/guide',
        accentColor: 'border-sky-200 hover:border-sky-400 bg-gradient-to-br from-sky-50/40 to-cyan-50/20',
        badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
        progressColor: 'bg-sky-600',
    },
    {
        id: 'federal',
        title: 'Federal CMMC & FedRAMP',
        badge: 'DFARS 7012 • NIST 800-171',
        tagline: 'CUI boundary isolation, 110 NIST controls, SPRS scoring (-203 to +110), and SSP packages.',
        route: '/federal/program-guide',
        accentColor: 'border-cyan-200 hover:border-cyan-400 bg-gradient-to-br from-cyan-50/40 to-blue-50/20',
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        progressColor: 'bg-cyan-600',
    }
];

function FrameworkSprintCard({
    framework,
    clientId
}: {
    framework: FastTrackFrameworkConfig;
    clientId: number;
}) {
    const [, setLocation] = useLocation();

    // Query real-time gate pass status from database telemetry
    const { data: gatesData, isLoading } = trpc.frameworkRoadmapGates.getMilestoneGates.useQuery(
        { clientId, frameworkId: framework.id },
        { enabled: !!clientId }
    );

    // Calculate progress & gate count
    const gates = gatesData?.milestoneGates || [
        { month: 1, passed: false },
        { month: 2, passed: false },
        { month: 3, passed: false }
    ];

    const passedCount = gates.filter((g: any) => g.passed).length;

    const handleNavigate = () => {
        setLocation(`/clients/${clientId}${framework.route}`);
    };

    return (
        <div
            onClick={handleNavigate}
            className={cn(
                "group relative flex flex-col justify-between p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
                framework.accentColor
            )}
        >
            <div>
                {/* Header Badge & Title */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2 py-0.5", framework.badgeColor)}>
                        {framework.badge}
                    </Badge>
                    {gatesData?.allPassed ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Certified
                        </Badge>
                    ) : (
                        <span className="text-[11px] font-medium text-slate-500">
                            90-Day Sprint
                        </span>
                    )}
                </div>

                <h4 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {framework.title}
                </h4>

                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {framework.tagline}
                </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-3">
                {/* Milestone Gates Badges */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">Milestone Gates</span>
                        <span className="font-bold text-slate-900">
                            {isLoading ? "..." : `${passedCount} of 3 Passed`}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map((month) => {
                            const gate = gates.find((g: any) => g.month === month);
                            const isPassed = gate?.passed;
                            return (
                                <div
                                    key={month}
                                    className={cn(
                                        "py-1 px-1.5 rounded-lg text-center text-[10px] font-bold border transition-colors flex items-center justify-center gap-1",
                                        isPassed
                                            ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                    )}
                                >
                                    {isPassed ? (
                                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                                    ) : (
                                        <Clock className="w-2.5 h-2.5 shrink-0 opacity-40" />
                                    )}
                                    <span>M{month}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom CTA Row */}
                <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 group-hover:text-primary transition-colors">
                        Launch Sprint
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </div>
    );
}

export function StrategicFastTrackWidget({ clientId }: { clientId: number }) {
    const [, setLocation] = useLocation();

    return (
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border-b border-slate-100 pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Tactical Execution Layer
                            </span>
                        </div>
                        <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            90-Day Implementation Sprints
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                            Turn high-level corporate roadmap objectives into turn-key 12-week regulatory programs. Each sprint features automated database telemetry verification, 3 monthly milestone gates, and cryptographic audit sign-off certificates.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/nis2`)}
                            className="text-xs font-semibold h-8 rounded-lg"
                        >
                            <CalendarClock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                            NIS2 Fast-Track
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/iso27001/program-guide`)}
                            className="text-xs font-semibold h-8 rounded-lg"
                        >
                            <Shield className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                            ISO 27001 Fast-Track
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {FRAMEWORKS.map((framework) => (
                        <FrameworkSprintCard
                            key={framework.id}
                            framework={framework}
                            clientId={clientId}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
