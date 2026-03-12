/**
 * NIS2 Control Health Widget
 * 
 * Displays status of NIS2 Article 21 controls on the main dashboard.
 * This is a simplified version that displays the widget structure.
 */

import React from "react";
import {
    Shield,
    AlertTriangle,
    CheckCircle2,
    FileText,
    Users,
    Lock,
    Database,
    Building2,
    Network,
    Bug,
    GraduationCap,
    KeyRound,
    ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// NIS2 Article 21 Categories as defined by EU Directive and ENISA Measures
export const NIS2_CATEGORIES = [
    { id: "policies", article: "21(2)(a)", enisaId: "1.1", title: "Policies & Analysis", icon: FileText, color: "bg-blue-500" },
    { id: "risk_management", article: "21(2)(b)", enisaId: "2.1", title: "Risk Management", icon: AlertTriangle, color: "bg-amber-500" },
    { id: "incident_handling", article: "21(2)(c)", enisaId: "3.1", title: "Incident Handling", icon: Shield, color: "bg-red-500" },
    { id: "business_continuity", article: "21(2)(d)", enisaId: "4.1", title: "Business Continuity", icon: Building2, color: "bg-green-500" },
    { id: "supply_chain", article: "21(2)(e)", enisaId: "5.1", title: "Supply Chain", icon: Network, color: "bg-purple-500" },
    { id: "acquisition", article: "21(2)(f)", enisaId: "6.1", title: "Acquisition & Development", icon: Bug, color: "bg-indigo-500" },
    { id: "effectiveness", article: "21(2)(g)", enisaId: "7.1", title: "Security Effectiveness", icon: CheckCircle2, color: "bg-teal-500" },
    { id: "training", article: "21(2)(h)", enisaId: "8.1", title: "Cyber Hygiene & Training", icon: GraduationCap, color: "bg-cyan-500" },
    { id: "cryptography", article: "21(2)(i)", enisaId: "9.1", title: "Cryptography", icon: KeyRound, color: "bg-yellow-500" },
    { id: "hr_security", article: "21(2)(j)", enisaId: "10.1", title: "Human Resources", icon: Users, color: "bg-pink-500" },
    { id: "access_control", article: "21(2)(k)", enisaId: "11.1", title: "Access Control", icon: Lock, color: "bg-orange-500" },
    { id: "asset_management", article: "21(2)(l)", enisaId: "12.1", title: "Asset Management", icon: Database, color: "bg-slate-500" },
];

// Sample data is kept for structure reference but not used in display when real data exists
const SAMPLE_CONTROL_DATA: Record<string, { status: string; score: number; metrics: { label: string; value: string | number }[] }> = {
    policies: { status: "in_progress", score: 65, metrics: [{ label: "Controls", value: "12/20" }] },
    risk_management: { status: "compliant", score: 85, metrics: [{ label: "High Risks", value: "3" }] },
};

interface NIS2ControlCardProps {
    category: typeof NIS2_CATEGORIES[0];
    status: string;
    score: number;
    metrics: { label: string; value: string | number }[];
    onClick?: () => void;
}

function NIS2ControlCard({ category, status, score, metrics, onClick }: NIS2ControlCardProps) {
    const getStatusColor = () => {
        switch (status) {
            case "compliant": return "text-emerald-600 bg-emerald-50";
            case "in_progress": return "text-amber-600 bg-amber-50";
            case "non_compliant": return "text-red-600 bg-red-50";
            case "not_applicable": return "text-slate-400 bg-slate-50";
            default: return "text-slate-500 bg-slate-50";
        }
    };

    const Icon = category.icon;

    return (
        <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200/60 hover:border-slate-300/80"
            onClick={onClick}
        >
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${category.color}/10`}>
                        <Icon className={`h-4 w-4 ${category.color.replace('bg-', 'text-')}`} />
                    </div>
                    <Badge className={`${getStatusColor()} border-0 text-xs font-bold`}>
                        {status.replace('_', ' ').toUpperCase()}
                    </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">{category.title}</CardTitle>
                <CardDescription className="text-xs">{category.article}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Compliance</span>
                        <span className="font-bold">{score}%</span>
                    </div>
                    <Progress value={score} className="h-2" />
                </div>
                <div className="space-y-1">
                    {metrics.map((metric, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-400">{metric.label}</span>
                            <span className="font-medium text-slate-600">{metric.value}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

interface NIS2ControlHealthProps {
    clientId: number | undefined;
}

export function NIS2ControlHealth({ clientId }: NIS2ControlHealthProps) {
    const [, setLocation] = useLocation();

    // TRPC query for NIS2 control data
    const { data: nis2Data, isLoading, error } = trpc.cyber.getMappings.useQuery(
        { clientId: clientId || 0, framework: 'NIS2' },
        { enabled: !!clientId }
    );

    const handleCategoryClick = (categoryId: string) => {
        const routes: Record<string, string> = {
            incident_handling: `/clients/${clientId}/cyber/incidents`,
            risk_management: `/clients/${clientId}/risks`,
            business_continuity: `/clients/${clientId}/business-continuity`,
            supply_chain: `/clients/${clientId}/vendors`,
            training: `/clients/${clientId}/training`,
            policies: `/clients/${clientId}/policies`,
            asset_management: `/clients/${clientId}/cyber/assets`,
        };
        if (routes[categoryId]) {
            setLocation(routes[categoryId]);
        }
    };

    // Calculate overall score from real data or show placeholder when no data
    const getScoreFromData = () => {
        if (nis2Data && nis2Data.length > 0) {
            let totalWeightedScore = 0;
            let totalPossibleControls = 0;
            let totalImplementedControls = 0;

            nis2Data.forEach((mapping: any) => {
                const implemented = mapping.implementedCount || 0;
                const total = mapping.mappedControlIds?.length || 0;

                totalImplementedControls += implemented;
                totalPossibleControls += total;
            });

            return totalPossibleControls > 0
                ? Math.round((totalImplementedControls / totalPossibleControls) * 100)
                : 0;
        }
        return null;
    };

    const totalScore = getScoreFromData();

    // Transform data for display
    const getDisplayData = (categoryId: string) => {
        if (nis2Data && nis2Data.length > 0) {
            const category = NIS2_CATEGORIES.find(c => c.id === categoryId);
            if (category) {
                // Find mappings matching either article or enisaId
                const mappings = nis2Data.filter((m: any) =>
                    m.enisaMeasureId === category.enisaId ||
                    m.nis2Article === category.article ||
                    m.article === category.article
                );

                if (mappings.length > 0) {
                    let totalImplemented = 0;
                    let totalControls = 0;

                    mappings.forEach((m: any) => {
                        totalImplemented += m.implementedCount || 0;
                        totalControls += m.mappedControlIds?.length || 0;
                    });

                    let status: string;
                    let score: number;

                    if (totalControls === 0) {
                        status = 'not_assessed';
                        score = 0;
                    } else if (totalImplemented === totalControls) {
                        status = 'compliant';
                        score = 100;
                    } else if (totalImplemented > 0) {
                        status = 'in_progress';
                        score = Math.round((totalImplemented / totalControls) * 100);
                    } else {
                        status = 'not_assessed';
                        score = 0;
                    }

                    return {
                        status,
                        score,
                        metrics: [{ label: 'Controls', value: `${totalImplemented}/${totalControls}` }]
                    };
                }
            }
        }
        return null;
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10">
                        <Shield className="h-5 w-5 text-sky-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">NIS2 Article 21 Controls</h3>
                        <p className="text-sm text-slate-500">Loading compliance data...</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="space-y-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                        <Shield className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-900">NIS2 Article 21 Controls</h3>
                        <p className="text-sm text-red-600">Failed to load compliance data</p>
                    </div>
                </div>
                <p className="text-xs text-red-500">{error.message}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10">
                        <Shield className="h-5 w-5 text-sky-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">NIS2 Article 21 Controls</h3>
                        <p className="text-sm text-slate-500">Real-time compliance status</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">{totalScore !== null ? `${totalScore}%` : '—'}</div>
                        <div className="text-xs text-slate-500">{totalScore !== null ? 'Overall Score' : 'No data'}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${clientId}/cyber/workbook`)}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {NIS2_CATEGORIES.map((category) => {
                    const data = getDisplayData(category.id);
                    // When no real data, show "not_assessed" status
                    const displayData = data || { status: "not_assessed", score: 0, metrics: [{ label: 'Status', value: 'No data' }] };
                    return (
                        <NIS2ControlCard
                            key={category.id}
                            category={category}
                            status={displayData.status}
                            score={displayData.score}
                            metrics={displayData.metrics}
                            onClick={() => handleCategoryClick(category.id)}
                        />
                    );
                })}
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span>Compliant</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>In Progress</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300" /><span>Not Assessed</span></div>
            </div>
        </div>
    );
}

export default NIS2ControlHealth;

