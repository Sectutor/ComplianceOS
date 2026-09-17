import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Separator } from "@complianceos/ui/ui/separator";
import { trpc } from "@/lib/trpc";
import { Target, Flag, TrendingUp, Scale, Building2, AlertTriangle, Shield, Clock, DollarSign, Calendar as CalendarIcon, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@complianceos/ui/ui/button";
import { format } from "date-fns";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";

interface StrategicRoadmapDetailProps {
    roadmapId: number;
    clientId: number;
    onEdit?: () => void;
}

export default function StrategicRoadmapDetail({ roadmapId, clientId, onEdit }: StrategicRoadmapDetailProps) {
    const { data: roadmap, isLoading } = trpc.roadmap.getStrategic.useQuery({ roadmapId });
    const { data: client } = trpc.clients.get.useQuery({ id: clientId }, { enabled: !!clientId });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (!roadmap) {
        return <div className="p-8 text-center text-muted-foreground">Roadmap not found</div>;
    }

    // Unpack the JSON description if it exists
    let packedData: any = {};
    try {
        if (roadmap.description && roadmap.description.startsWith('{')) {
            packedData = JSON.parse(roadmap.description);
        }
    } catch (e) {
        console.error("Failed to parse roadmap description JSON", e);
    }

    const { businessContext, drivers, posture, metrics, governance, detailedObjectives } = packedData;

    // Fallback if detailedObjectives are missing but standard objectives exist
    const objectives = detailedObjectives || (roadmap.objectives || []).map((t: string) => ({ title: t, priority: 'Medium' }));

    // Resolve dedicated enterprise program guide info if available
    const getProgramGuideInfo = () => {
        const titleLower = (roadmap.title || '').toLowerCase();
        const frameworkLower = (roadmap.framework || '').toLowerCase();

        if (titleLower.includes('iso 27001') || frameworkLower.includes('iso 27001') || frameworkLower.includes('iso')) {
            return {
                title: "Interactive ISO 27001 ISMS Program Guide & 90-Day Roadmap",
                desc: "Explore the comprehensive Clauses 4–10 ISMS manual, 93 Statement of Applicability controls, and Auditor Clean Room.",
                url: `/clients/${clientId}/iso27001/program-guide?tab=roadmap`,
                badge: "ISMS Certified"
            };
        }
        if (titleLower.includes('nis2') || frameworkLower.includes('nis2') || titleLower.includes('cyber resilience')) {
            return {
                title: "NIS2 & Cyber Resilience Program Guide & 90-Day Roadmap",
                desc: "Execute Article 21 cybersecurity measures, 24h early warning, 72h incident notification, and supply chain audits.",
                url: `/clients/${clientId}/cyber/program-guide?tab=roadmap`,
                badge: "EU Directive"
            };
        }
        if (titleLower.includes('privacy') || frameworkLower.includes('gdpr') || titleLower.includes('gdpr')) {
            return {
                title: "EU GDPR & Global Privacy Program Guide & 90-Day Roadmap",
                desc: "Manage Article 30 RoPA records, Transfer Impact Assessments (TIAs), DPIAs, and DSAR automated workflows.",
                url: `/clients/${clientId}/privacy/program-guide?tab=roadmap`,
                badge: "Privacy by Design"
            };
        }
        if (titleLower.includes('continuity') || frameworkLower.includes('bcp') || frameworkLower.includes('22301') || titleLower.includes('business continuity')) {
            return {
                title: "Business Continuity (ISO 22301) Program Guide & 90-Day Roadmap",
                desc: "Complete Business Impact Analysis (BIA), define RTO/RPO targets, call trees, and execute disaster tabletop drills.",
                url: `/clients/${clientId}/business-continuity/program-guide?tab=roadmap`,
                badge: "Operational Resilience"
            };
        }
        if (titleLower.includes('vendor') || frameworkLower.includes('tprm') || titleLower.includes('third-party')) {
            return {
                title: "Third-Party & Vendor Risk (TPRM) Program Guide & 90-Day Roadmap",
                desc: "Tier critical vendors, issue SIG/CAIQ questionnaires, inspect SOC 2 reports, and track DPAs.",
                url: `/clients/${clientId}/vendors/program-guide?tab=roadmap`,
                badge: "Supply Chain Security"
            };
        }
        if (titleLower.includes('soc 2') || frameworkLower.includes('soc 2') || titleLower.includes('soc2')) {
            return {
                title: "SOC 2 Type II Program Guide & 90-Day Implementation Roadmap",
                desc: "Explore AICPA Trust Services Criteria (CC1–CC9), continuous automated evidence collection, and CPA Auditor Clean Room.",
                url: `/clients/${clientId}/soc2/program-guide?tab=roadmap`,
                badge: "AICPA Attestation"
            };
        }
        if (titleLower.includes('cmmc') || frameworkLower.includes('cmmc') || titleLower.includes('defense') || frameworkLower.includes('federal')) {
            return {
                title: "Defense Federal & CMMC 2.0 Program Guide & 90-Day Roadmap",
                desc: "Track 110 NIST SP 800-171 controls, compute official SPRS scores, and generate System Security Plans (SSP).",
                url: `/clients/${clientId}/federal/program-guide?tab=roadmap`,
                badge: "DoD C3PAO Ready"
            };
        }
        if (titleLower.includes('hipaa') || frameworkLower.includes('hipaa')) {
            return {
                title: "HIPAA Compliance Program Guide & 90-Day Implementation Roadmap",
                desc: "Step-by-step statutory scoping, ePHI technical safeguards, BAA ledger, and HHS OCR audit clean room.",
                url: `/clients/${clientId}/hipaa/program-guide?tab=roadmap`,
                badge: "HHS OCR Compliant"
            };
        }
        if (titleLower.includes('risk') || frameworkLower.includes('31000') || frameworkLower.includes('rmf')) {
            return {
                title: "Enterprise Risk Management (ISO 27005 / ISO 31000) Program Guide & Roadmap",
                desc: "Establish risk context, assess inherent vs residual scores, and track executive risk treatment plans.",
                url: `/clients/${clientId}/risks/program-guide?tab=roadmap`,
                badge: "Risk Architecture"
            };
        }
        if (titleLower.includes('incident') || titleLower.includes('csirt')) {
            return {
                title: "Cyber Incident Response Center & CSIRT Playbooks",
                desc: "Operational incident triage, containment playbooks, forensic evidence preservation, and 72-hour notifications.",
                url: `/clients/${clientId}/cyber/incidents`,
                badge: "CSIRT Response"
            };
        }
        return null;
    };

    const programGuide = getProgramGuideInfo();

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header Section */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{roadmap.title}</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                            {roadmap.framework || "General Strategy"}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                            • Target: {roadmap.targetDate ? format(new Date(roadmap.targetDate), 'PPP') : 'Not defined'}
                        </span>
                        <Badge className="ml-2 capitalize bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                            {roadmap.status?.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>
                <Button onClick={() => window.location.href = `/clients/${clientId}/roadmap/${roadmapId}/edit`}>
                    Edit Configuration
                </Button>
            </div>

            {/* Dedicated Enterprise Program Guide Banner */}
            {programGuide && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 border border-indigo-800/60 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-blue-400">
                            <Shield className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-white">{programGuide.title}</h3>
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px] font-bold">{programGuide.badge}</Badge>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">{programGuide.desc}</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => window.location.href = programGuide.url}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 shadow-lg text-xs h-10 px-4"
                    >
                        Launch Comprehensive Guide <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-12 gap-6">
                {/* Main Content Column */}
                <div className="col-span-12 lg:col-span-8 space-y-6">

                    {/* Vision & Context Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                Strategic Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Organizational
                                </h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between border-b pb-1 border-dashed">
                                        <span className="text-muted-foreground">Industry</span>
                                        <span className="font-medium">{businessContext?.industry || "Not set"}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-dashed pt-1">
                                        <span className="text-muted-foreground">Size</span>
                                        <span className="font-medium capitalize">{businessContext?.orgSize || "Not set"}</span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="text-muted-foreground text-xs block mb-1">Strategic Goals</span>
                                        <div className="flex flex-wrap gap-1">
                                            {businessContext?.goals?.map((g: string) => (
                                                <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Risk & Posture
                                </h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between border-b pb-1 border-dashed">
                                        <span className="text-muted-foreground">Maturity Level</span>
                                        <span className="font-medium">{posture?.maturityLevel || "Initial"}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 border-dashed pt-1">
                                        <span className="text-muted-foreground">Risk Appetite</span>
                                        <span className="font-medium">{businessContext?.riskAppetite ? `${businessContext.riskAppetite}/5` : "Not set"}</span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="text-muted-foreground text-xs block mb-1">Critical Assets</span>
                                        <div className="flex flex-wrap gap-1">
                                            {posture?.keyAssets?.map((a: string) => (
                                                <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Objectives Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Flag className="w-5 h-5 text-primary" />
                                Strategic Objectives
                            </CardTitle>
                            <CardDescription>
                                Key milestones and deliverables for this roadmap
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {objectives.map((obj: any, i: number) => (
                                <div key={i} className="p-4 border rounded-lg bg-card/50 hover:bg-card transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-sm">{obj.title}</h4>
                                        <Badge variant={obj.priority === 'Critical' ? 'destructive' : obj.priority === 'High' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                                            {obj.priority}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                        {obj.alignment && (
                                            <div className="flex items-center gap-1">
                                                <Target className="w-3 h-3" />
                                                <span>Aligns: {obj.alignment}</span>
                                            </div>
                                        )}
                                        {obj.horizon && (
                                            <div className="flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3" />
                                                <span>{obj.horizon}</span>
                                            </div>
                                        )}
                                        {obj.owner && (
                                            <div className="flex items-center gap-1">
                                                <Flag className="w-3 h-3" />
                                                <span>{obj.owner}</span>
                                            </div>
                                        )}
                                        {obj.estimatedHours && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{obj.estimatedHours}h</span>
                                            </div>
                                        )}
                                    </div>

                                    {obj.linkedRisks && obj.linkedRisks.length > 0 && (
                                        <div className="mt-3 flex gap-2 items-center">
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase">Mitigates:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {obj.linkedRisks.map((r: string) => (
                                                    <Badge key={r} variant="outline" className="text-[10px] h-5 border-warning/30 text-amber-700 bg-amber-50">
                                                        <Shield className="w-2.5 h-2.5 mr-1" />{r}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Column */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Metrics / KPI Card */}
                    <Card>
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Success Metrics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {metrics && metrics.length > 0 ? (
                                metrics.map((m: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-gray-700">{m.name}</span>
                                        <div className="text-right">
                                            <span className="block font-bold text-primary">
                                                {m.type === 'Currency' 
                                                    ? formatCurrency(m.targetValue, client?.currency, client?.locale) 
                                                    : `${m.targetValue}${m.type === 'Percentage' ? '%' : ''}`}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{m.frequency}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No specific KPIs defined.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Governance Card */}
                    <Card>
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                <Scale className="w-4 h-4" /> Governance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-sm">
                            <div>
                                <span className="text-xs text-muted-foreground block">Review Cadence</span>
                                <span className="font-medium">{governance?.reviewCadence || "Not set"}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">Oversight Body</span>
                                <span className="font-medium">{governance?.oversightCommittee || "Not defined"}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">Reporting Format</span>
                                <span className="font-medium">{governance?.reportingFormat || "Standard"}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Drivers Card */}
                    <Card>
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Drivers
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-sm">
                            <div>
                                <span className="text-xs text-muted-foreground block">Frameworks</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {drivers?.frameworks?.map((f: string) => (
                                        <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                                    )) || <span className="italic text-muted-foreground">None</span>}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">Audit Type</span>
                                <span className="font-medium capitalize">{drivers?.auditType || "Standard"}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
