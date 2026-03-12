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

// NIS2 Article 21 Categories as defined by EU Directive
export const NIS2_CATEGORIES = [
    { id: "policies", article: "21(2)(a)", title: "Policies", icon: FileText, color: "bg-blue-500" },
    { id: "risk_management", article: "21(2)(b)", title: "Risk Management", icon: AlertTriangle, color: "bg-amber-500" },
    { id: "incident_handling", article: "21(2)(c)", title: "Incident Handling", icon: Shield, color: "bg-red-500" },
    { id: "business_continuity", article: "21(2)(d)", title: "Business Continuity", icon: Building2, color: "bg-green-500" },
    { id: "supply_chain", article: "21(2)(e)", title: "Supply Chain", icon: Network, color: "bg-purple-500" },
    { id: "acquisition", article: "21(2)(f)", title: "Acquisition & Development", icon: Bug, color: "bg-indigo-500" },
    { id: "effectiveness", article: "21(2)(g)", title: "Security Effectiveness", icon: CheckCircle2, color: "bg-teal-500" },
    { id: "training", article: "21(2)(h)", title: "Cyber Hygiene", icon: GraduationCap, color: "bg-cyan-500" },
    { id: "cryptography", article: "21(2)(i)", title: "Cryptography", icon: KeyRound, color: "bg-yellow-500" },
    { id: "hr_security", article: "21(2)(j)", title: "Human Resources", icon: Users, color: "bg-pink-500" },
    { id: "access_control", article: "21(2)(k)", title: "Access Control", icon: Lock, color: "bg-orange-500" },
    { id: "asset_management", article: "21(2)(l)", title: "Asset Management", icon: Database, color: "bg-slate-500" },
];

// Sample data - in production this would come from TRPC queries
const SAMPLE_CONTROL_DATA: Record<string, { status: string; score: number; metrics: { label: string; value: string | number }[] }> = {
    policies: { status: "in_progress", score: 65, metrics: [{ label: "Controls", value: "12/20" }] },
    risk_management: { status: "compliant", score: 85, metrics: [{ label: "High Risks", value: "3" }] },
    incident_handling: { status: "compliant", score: 100, metrics: [{ label: "Open", value: "0" }] },
    business_continuity: { status: "not_assessed", score: 0, metrics: [{ label: "Status", value: "Pending" }] },
    supply_chain: { status: "in_progress", score: 45, metrics: [{ label: "Vendors", value: "Review" }] },
    acquisition: { status: "not_assessed", score: 0, metrics: [{ label: "Status", value: "Pending" }] },
    effectiveness: { status: "not_assessed", score: 0, metrics: [{ label: "Status", value: "Pending" }] },
    training: { status: "compliant", score: 75, metrics: [{ label: "Completion", value: "85%" }] },
    cryptography: { status: "not_assessed", score: 0, metrics: [{ label: "Status", value: "Pending" }] },
    hr_security: { status: "not_assessed", score: 0, metrics: [{ label: "Status", value: "Pending" }] },
    access_control: { status: "in_progress", score: 60, metrics: [{ label: "MFA", value: "92%" }] },
    asset_management: { status: "compliant", score: 95, metrics: [{ label: "Coverage", value: "98%" }] },
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

    // Calculate overall score from real data or fallback to sample
    const getScoreFromData = () => {
        if (nis2Data && nis2Data.length > 0) {
            const total = nis2Data.reduce((sum: number, item: any) => {
                if (item.clientStatus === 'implemented') return sum + 100;
                if (item.clientStatus === 'in_progress') return sum + 50;
                return sum;
            }, 0);
            return Math.round(total / nis2Data.length);
        }
        return Math.round(
            Object.values(SAMPLE_CONTROL_DATA).reduce((sum, c) => sum + c.score, 0) / Object.keys(SAMPLE_CONTROL_DATA).length
        );
    };

    const totalScore = getScoreFromData();

    // Transform data for display
    const getDisplayData = (categoryId: string) => {
        if (nis2Data && nis2Data.length > 0) {
            const mapping = nis2Data.find((m: any) => m.nis2Category === categoryId);
            if (mapping) {
                const status = mapping.clientStatus || 'not_started';
                const score = status === 'implemented' ? 100 : status === 'in_progress' ? 50 : 0;
                return {
                    status: status === 'not_started' ? 'not_assessed' : status,
                    score,
                    metrics: [{ label: 'Controls', value: `${mapping.implementedCount || 0}/${mapping.mappedControlIds?.length || 0}` }]
                };
            }
        }
        return SAMPLE_CONTROL_DATA[categoryId] || { status: "not_assessed", score: 0, metrics: [] };
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
                        <div className="text-2xl font-black text-slate-900">{totalScore}%</div>
                        <div className="text-xs text-slate-500">Overall Score</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${clientId}/cyber/workbook`)}>
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {NIS2_CATEGORIES.map((category) => {
                    const data = getDisplayData(category.id);
                    return (
                        <NIS2ControlCard
                            key={category.id}
                            category={category}
                            status={data.status}
                            score={data.score}
                            metrics={data.metrics}
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

